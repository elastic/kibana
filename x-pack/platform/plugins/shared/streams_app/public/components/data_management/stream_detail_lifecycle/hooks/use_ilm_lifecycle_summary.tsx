/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, useState } from 'react';
import type { Streams } from '@kbn/streams-schema';
import {
  isIlmLifecycle,
  type IngestStreamLifecycle,
  type IlmPolicyDeletePhase,
  type IlmPolicyPhase,
  type IlmPolicy,
  type IlmPolicyWithUsage,
} from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { useAbortController } from '@kbn/react-hooks';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';
import { useKibana } from '../../../../hooks/use_kibana';
import { useIlmPhasesColorAndDescription } from './use_ilm_phases_color_and_description';
import type { DataStreamStats } from './use_data_stream_stats';
import { formatBytes } from '../helpers/format_bytes';
import { getILMRatios } from '../helpers/helpers';
import type { AffectedResource } from '../downsampling/edit_policy_modal/edit_policy_modal';
import { EditPolicyModal } from '../downsampling/edit_policy_modal/edit_policy_modal';
import { CreatePolicyModal } from '../downsampling/create_new_policy_modal/create_new_policy_modal';
import type { LifecyclePhase } from '../common/data_lifecycle/lifecycle_types';

type ModalType = 'delete' | 'createPolicy' | null;

interface DeleteContext {
  type: 'phase' | 'downsampleStep';
  name: string;
  stepNumber?: number;
  isManaged?: boolean;
}

interface UseIlmLifecycleSummaryProps {
  definition: Streams.ingest.all.GetResponse;
  stats?: DataStreamStats;
  refreshDefinition?: () => void;
  updateStreamLifecycle: (lifecycle: IngestStreamLifecycle) => Promise<void>;
}

interface UseIlmLifecycleSummaryResult {
  phases: LifecyclePhase[];
  loading: boolean;
  onRemovePhase?: (phaseName: string) => void;
  onRemoveDownsampleStep?: (stepNumber: number) => void;
  modals: React.ReactNode;
}

export const useIlmLifecycleSummary = ({
  definition,
  stats,
  refreshDefinition,
  updateStreamLifecycle,
}: UseIlmLifecycleSummaryProps): UseIlmLifecycleSummaryResult => {
  const {
    core: { notifications },
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const { ilmPhases } = useIlmPhasesColorAndDescription();
  const { signal } = useAbortController();

  const isIlm = isIlmLifecycle(definition.effective_lifecycle);
  const policyName = isIlm
    ? (definition.effective_lifecycle as { ilm: { policy: string } }).ilm.policy
    : '';

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [deleteContext, setDeleteContext] = useState<DeleteContext | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const currentPolicy = useRef<IlmPolicyWithUsage | null>(null);
  const [policyNames, setPolicyNames] = useState<string[]>([]);

  const buildAffectedResources = (policy: IlmPolicyWithUsage): AffectedResource[] => {
    const streams = (policy.in_use_by?.data_streams ?? []).filter(
      (streamName) => streamName !== definition.stream.name
    );
    const indices = policy.in_use_by?.indices ?? [];

    return [
      ...streams.map((streamName) => ({ name: streamName, type: 'stream' as const })),
      ...indices.map((indexName) => ({ name: indexName, type: 'index' as const })),
    ];
  };

  const affectedResources = currentPolicy.current
    ? buildAffectedResources(currentPolicy.current)
    : [];

  const fetchPolicies = async () => {
    const policies = await streamsRepositoryClient.fetch(
      'GET /internal/streams/lifecycle/_policies',
      { signal }
    );
    const foundPolicy = policies.find((policy) => policy.name === policyName);
    currentPolicy.current = foundPolicy ?? null;
    setPolicyNames(policies.map((policy) => policy.name));
  };

  const getModifiedPhases = (policy: IlmPolicy, context: DeleteContext) => {
    const phases = {
      ...policy.phases,
    } as Record<string, IlmPolicyPhase | IlmPolicyDeletePhase | undefined>;

    if (context.type === 'phase') {
      delete phases[context.name as keyof typeof phases];
      return phases;
    }

    if (context.type === 'downsampleStep' && context.stepNumber) {
      const phaseOrder: Array<keyof typeof phases> = ['hot', 'warm', 'cold', 'frozen', 'delete'];
      let downsampleIndex = 0;

      for (const phaseName of phaseOrder) {
        const phase = phases[phaseName];
        if (!phase) {
          continue;
        }
        if (phaseName === 'delete') {
          continue;
        }

        // Raw ES policy data has actions.downsample, not top-level downsample
        const phaseWithActions = phase as IlmPolicyPhase & {
          actions?: Record<string, unknown>;
        };
        const actions = phaseWithActions.actions ?? {};
        if (!('downsample' in actions)) {
          continue;
        }

        downsampleIndex += 1;
        if (downsampleIndex !== context.stepNumber) {
          continue;
        }

        const { downsample: _downsample, ...remainingActions } = actions;
        (phases[phaseName] as typeof phaseWithActions) = {
          ...phaseWithActions,
          actions: remainingActions,
        };
        break;
      }
    }

    return phases;
  };

  const handleCancelModal = () => {
    setActiveModal(null);
    setDeleteContext(null);
  };

  const saveIlmPolicy = async (
    policy: IlmPolicy,
    allowOverwrite = false,
    sourcePolicyName?: string
  ) => {
    const phases = Object.fromEntries(
      Object.entries(policy.phases).map(([phaseName, phase]) => [
        phaseName,
        phase ? { ...phase } : phase,
      ])
    );

    await streamsRepositoryClient.fetch('POST /internal/streams/lifecycle/_policy', {
      params: {
        query: {
          allow_overwrite: allowOverwrite,
        },
        body: {
          name: policy.name,
          phases,
          meta: policy.meta,
          deprecated: policy.deprecated,
          ...(sourcePolicyName ? { source_policy_name: sourcePolicyName } : {}),
        },
      },
      signal,
    });
  };

  const {
    value: ilmStatsValue,
    loading: ilmLoading,
    refresh: refreshIlmStats,
  } = useStreamsAppFetch(
    ({ signal: fetchSignal }) => {
      if (!isIlm) {
        return undefined;
      }
      return streamsRepositoryClient.fetch('GET /internal/streams/{name}/lifecycle/_stats', {
        params: { path: { name: definition.stream.name } },
        signal: fetchSignal,
      });
    },
    [streamsRepositoryClient, definition, isIlm]
  );

  const applyOverwrite = async (context: DeleteContext) => {
    if (!isIlm) {
      return;
    }

    try {
      setIsProcessing(true);

      if (!currentPolicy.current) {
        throw new Error('Policy not found');
      }

      const modifiedPhases = getModifiedPhases(currentPolicy.current, context);
      const updatedPolicy: IlmPolicy = {
        name: policyName,
        phases: modifiedPhases,
        meta: currentPolicy.current.meta,
        deprecated: currentPolicy.current.deprecated,
      };

      await saveIlmPolicy(updatedPolicy, true);

      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.streams.lifecycleSummary.policyUpdated', {
          defaultMessage: 'ILM policy updated successfully',
        }),
      });
      await Promise.resolve(refreshDefinition?.());
      refreshIlmStats();
      handleCancelModal();
    } catch (error) {
      notifications.toasts.addError(error as Error, {
        title: i18n.translate('xpack.streams.lifecycleSummary.policyUpdateFailed', {
          defaultMessage: 'Failed to update ILM policy',
        }),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const openDeleteModal = async (context: DeleteContext) => {
    if (!isIlm) {
      return;
    }

    try {
      await fetchPolicies();

      if (!currentPolicy.current) {
        throw new Error('Policy not found');
      }

      const resources = buildAffectedResources(currentPolicy.current);
      const isManaged = currentPolicy.current.meta?.managed === true;

      if (resources.length === 0 && !isManaged) {
        applyOverwrite(context);
        return;
      }

      setDeleteContext({
        ...context,
        isManaged,
      });
      setActiveModal('delete');
    } catch (error) {
      notifications.toasts.addError(error as Error, {
        title: i18n.translate('xpack.streams.lifecycleSummary.policyLoadFailed', {
          defaultMessage: 'Failed to load ILM policy details',
        }),
      });
    }
  };

  const handleRemovePhase = (phaseName: string) => {
    openDeleteModal({ type: 'phase', name: phaseName });
  };

  const handleRemoveIlmDownsampleStep = (stepNumber: number) => {
    openDeleteModal({ type: 'downsampleStep', name: `step-${stepNumber}`, stepNumber });
  };

  const handleOverwrite = () => {
    if (!deleteContext) {
      return;
    }
    applyOverwrite(deleteContext);
  };

  const handleSaveAsNew = async () => {
    setActiveModal('createPolicy');
  };

  const handleCreatePolicy = async (newPolicyName: string) => {
    if (!deleteContext || !isIlm) {
      return;
    }

    try {
      setIsProcessing(true);

      if (!currentPolicy.current) {
        throw new Error('Policy not found');
      }

      const modifiedPhases = getModifiedPhases(currentPolicy.current, deleteContext);

      const originalHasHot = Boolean(currentPolicy.current.phases.hot);
      if (originalHasHot && !('hot' in modifiedPhases)) {
        notifications.toasts.addWarning({
          title: i18n.translate('xpack.streams.lifecycleSummary.cannotCreateWithoutHot', {
            defaultMessage: 'Cannot create policy without hot phase',
          }),
          text: i18n.translate('xpack.streams.lifecycleSummary.cannotCreateWithoutHotDescription', {
            defaultMessage:
              'The original policy includes a hot phase. A cloned policy must also include it.',
          }),
        });
        setIsProcessing(false);
        return;
      }

      // Strip the 'managed' field from meta when creating a new policy
      const { managed: _managed, ...restMeta } = currentPolicy.current.meta ?? {};

      const updatedPolicy: IlmPolicy = {
        name: newPolicyName,
        phases: modifiedPhases,
        meta: restMeta,
      };

      await saveIlmPolicy(updatedPolicy, false, currentPolicy.current.name);

      await updateStreamLifecycle({ ilm: { policy: newPolicyName } });

      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.streams.lifecycleSummary.newPolicyCreated', {
          defaultMessage: 'New ILM policy created and assigned to stream',
        }),
      });

      await Promise.resolve(refreshDefinition?.());
      refreshIlmStats();
      handleCancelModal();
    } catch (error) {
      notifications.toasts.addError(error as Error, {
        title: i18n.translate('xpack.streams.lifecycleSummary.newPolicyFailed', {
          defaultMessage: 'Failed to create new ILM policy',
        }),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBackFromCreatePolicy = () => {
    setActiveModal('delete');
  };

  const getPhases = (): LifecyclePhase[] => {
    if (!isIlm) {
      return [];
    }

    const phasesWithGrow = getILMRatios(ilmStatsValue);
    if (!phasesWithGrow) {
      return [];
    }

    // Calculate total docs and distribute based on size ratio
    const totalDocs = stats?.totalDocs || 0;
    const totalSize = phasesWithGrow.reduce(
      (sum, phase) => sum + ('size_in_bytes' in phase ? phase.size_in_bytes : 0),
      0
    );

    // Count non-delete phases to determine if delete should be disabled
    const nonDeletePhases = phasesWithGrow.filter((phase) => phase.name !== 'delete');
    const isLastNonDeletePhase = nonDeletePhases.length === 1;

    return phasesWithGrow.map((phase, index) => {
      // Estimate doc count based on size ratio
      const phaseSize = 'size_in_bytes' in phase ? phase.size_in_bytes : 0;
      const estimatedDocs =
        totalSize > 0 && totalDocs > 0
          ? Math.round((phaseSize / totalSize) * totalDocs)
          : undefined;

      // Get readonly and searchable_snapshot from the server-side phase data
      const hasReadonlyAction = 'readonly' in phase && phase.readonly === true;
      const searchableSnapshotAction =
        'searchable_snapshot' in phase ? phase.searchable_snapshot : undefined;

      // Determine if remove is disabled for this phase
      const isRemoveDisabled = phase.name !== 'delete' && isLastNonDeletePhase;
      const removeDisabledReason = isRemoveDisabled
        ? i18n.translate('xpack.streams.lifecycleSummary.cannotRemoveLastPhase', {
            defaultMessage:
              'An ILM policy must have at least one phase (other than delete). This is the only remaining phase.',
          })
        : undefined;

      return {
        color: ilmPhases[phase.name].color,
        name: phase.name,
        label: phase.name,
        size: 'size_in_bytes' in phase ? formatBytes(phase.size_in_bytes) : undefined,
        grow: phase.grow,
        isDelete: phase.name === 'delete',
        timelineValue: phasesWithGrow[index + 1]?.min_age,
        description: ilmPhases[phase.name].description,
        sizeInBytes: 'size_in_bytes' in phase ? phase.size_in_bytes : undefined,
        docsCount: estimatedDocs,
        min_age: phase.min_age,
        isReadOnly: hasReadonlyAction,
        downsample: 'downsample' in phase ? phase.downsample : undefined,
        searchableSnapshot: searchableSnapshotAction,
        isRemoveDisabled,
        removeDisabledReason,
      };
    });
  };

  const modals = isIlm ? (
    <>
      {activeModal === 'delete' && deleteContext && (
        <EditPolicyModal
          affectedResources={affectedResources}
          isManaged={deleteContext?.isManaged}
          isProcessing={isProcessing}
          onCancel={handleCancelModal}
          onOverwrite={handleOverwrite}
          onSaveAsNew={handleSaveAsNew}
        />
      )}

      {activeModal === 'createPolicy' && (
        <CreatePolicyModal
          policyNames={policyNames}
          onBack={handleBackFromCreatePolicy}
          onSave={handleCreatePolicy}
          isLoading={isProcessing}
          originalPolicyName={policyName}
        />
      )}
    </>
  ) : null;

  return {
    phases: getPhases(),
    loading: isIlm && ilmLoading,
    onRemovePhase: isIlm ? handleRemovePhase : undefined,
    onRemoveDownsampleStep: isIlm ? handleRemoveIlmDownsampleStep : undefined,
    modals,
  };
};
