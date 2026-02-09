/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, useState } from 'react';
import { isIlmLifecycle } from '@kbn/streams-schema';
import type {
  Streams,
  IngestStreamLifecycle,
  IlmPolicyPhases,
  PhaseName,
  IlmPolicy,
  IlmPolicyWithUsage,
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
import { EditIlmPhasesFlyout } from '../downsampling/edit_ilm_phases_flyout';
import type { LifecyclePhase } from '../common/data_lifecycle/lifecycle_types';
import { useSnapshotRepositories } from './use_snapshot_repositories';

type ModalType = 'delete' | 'edit' | 'createPolicy' | null;

type IlmPolicyWithOptionalUsage = IlmPolicy & Partial<Pick<IlmPolicyWithUsage, 'in_use_by'>>;

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
  onEditPhase?: (phaseName: PhaseName) => void;
  onEditDownsampleStep?: (stepNumber: number, phaseName?: PhaseName) => void;
  editingPhase?: PhaseName;
  modals: React.ReactNode;
  ilmSelectedPhasesForAdd?: PhaseName[];
  onAddIlmPhase?: (phase: PhaseName) => void;
}

export const useIlmLifecycleSummary = ({
  definition,
  stats,
  refreshDefinition,
  updateStreamLifecycle,
}: UseIlmLifecycleSummaryProps): UseIlmLifecycleSummaryResult => {
  const {
    core: { notifications, application },
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const { ilmPhases } = useIlmPhasesColorAndDescription();
  const { signal } = useAbortController();

  // Hook to fetch snapshot repositories
  const {
    repositories: snapshotRepositories,
    isLoading: isLoadingSnapshotRepositories,
    refresh: refreshSnapshotRepositories,
  } = useSnapshotRepositories();

  const isIlm = isIlmLifecycle(definition.effective_lifecycle);
  const policyName = isIlm
    ? (definition.effective_lifecycle as { ilm: { policy: string } }).ilm.policy
    : '';

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [deleteContext, setDeleteContext] = useState<DeleteContext | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const currentPolicy = useRef<IlmPolicyWithOptionalUsage | null>(null);
  const [policyNames, setPolicyNames] = useState<string[]>([]);
  const [isEditFlyoutOpen, setIsEditFlyoutOpen] = useState(false);
  const [editFlyoutInitialPhases, setEditFlyoutInitialPhases] = useState<IlmPolicyPhases | null>(
    null
  );
  const [editFlyoutInitialSelectedPhase, setEditFlyoutInitialSelectedPhase] = useState<
    PhaseName | undefined
  >(undefined);
  const [editFlyoutPhaseToEnableOnOpen, setEditFlyoutPhaseToEnableOnOpen] = useState<
    PhaseName | undefined
  >(undefined);
  const [isSavingEditFlyout, setIsSavingEditFlyout] = useState(false);
  const [previewPhases, setPreviewPhases] = useState<IlmPolicyPhases | null>(null);
  const [editingPhase, setEditingPhase] = useState<PhaseName | undefined>(undefined);
  const [editContext, setEditContext] = useState<{ isManaged: boolean } | null>(null);
  const pendingEditEsPhasesRef = useRef<IlmPolicyPhases | null>(null);
  const pendingNewPolicyEsPhasesRef = useRef<IlmPolicyPhases | null>(null);
  const [createPolicyBackModal, setCreatePolicyBackModal] = useState<'delete' | 'edit' | null>(
    null
  );

  const buildAffectedResources = (policy: IlmPolicyWithOptionalUsage): AffectedResource[] => {
    const streams = (policy.in_use_by?.dataStreams ?? []).filter(
      (streamName: string) => streamName !== definition.stream.name
    );
    const indices = policy.in_use_by?.indices ?? [];

    return [
      ...streams.map((streamName: string) => ({ name: streamName, type: 'stream' as const })),
      ...indices.map((indexName: string) => ({ name: indexName, type: 'index' as const })),
    ];
  };

  const affectedResources = currentPolicy.current
    ? buildAffectedResources(currentPolicy.current)
    : [];

  const fetchPolicies = async () => {
    const policies = await streamsRepositoryClient.fetch(
      'GET /internal/streams/lifecycle/policies',
      { signal }
    );
    const foundPolicy = policies.find((policy) => policy.name === policyName);
    currentPolicy.current = foundPolicy ?? null;
    setPolicyNames(policies.map((policy) => policy.name));
  };

  const getModifiedPhases = (policy: IlmPolicy, context: DeleteContext) => {
    const phases = {
      ...policy.phases,
    } as IlmPolicyPhases;

    if (context.type === 'phase') {
      delete (phases as any)[context.name];
      return phases;
    }

    if (context.type === 'downsampleStep' && context.stepNumber) {
      const phaseOrder: Array<keyof IlmPolicyPhases> = ['hot', 'warm', 'cold', 'frozen', 'delete'];
      let downsampleIndex = 0;

      for (const phaseName of phaseOrder) {
        const phase = (phases as any)[phaseName];
        if (!phase) {
          continue;
        }
        if (phaseName === 'delete') {
          continue;
        }

        const actions = phase.actions ?? {};
        if (!('downsample' in actions)) {
          continue;
        }

        downsampleIndex += 1;
        if (downsampleIndex !== context.stepNumber) {
          continue;
        }

        const { downsample: _downsample, ...remainingActions } = actions;
        (phases as any)[phaseName] = {
          ...phase,
          actions: Object.keys(remainingActions).length > 0 ? remainingActions : undefined,
        };
        break;
      }
    }

    return phases;
  };

  const handleCancelModal = () => {
    setActiveModal(null);
    setDeleteContext(null);
    setEditContext(null);
    pendingEditEsPhasesRef.current = null;
    pendingNewPolicyEsPhasesRef.current = null;
    setCreatePolicyBackModal(null);
  };

  const saveIlmPolicy = async (policy: IlmPolicy, allowOverwrite = false) => {
    const phases = Object.fromEntries(
      Object.entries(policy.phases).map(([phaseName, phase]) => [
        phaseName,
        phase ? { ...phase } : phase,
      ])
    );

    await streamsRepositoryClient.fetch('POST /internal/streams/lifecycle/policy', {
      params: {
        body: {
          name: policy.name,
          phases,
          _meta: policy._meta,
          deprecated: policy.deprecated,
          allowOverwrite,
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
        _meta: currentPolicy.current._meta,
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
      const isManaged = currentPolicy.current._meta?.managed === true;

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

  const overwriteEditPolicy = async () => {
    if (!isIlm) return;

    const nextEsPhases = pendingEditEsPhasesRef.current;
    if (!nextEsPhases) return;

    try {
      setIsSavingEditFlyout(true);
      setIsProcessing(true);

      await fetchPolicies();
      if (!currentPolicy.current) {
        throw new Error('Policy not found');
      }

      const updatedPolicy: IlmPolicy = {
        name: policyName,
        phases: nextEsPhases as any,
        _meta: currentPolicy.current._meta,
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
      closeEditFlyout();
    } catch (error) {
      notifications.toasts.addError(error as Error, {
        title: i18n.translate('xpack.streams.lifecycleSummary.policyUpdateFailed', {
          defaultMessage: 'Failed to update ILM policy',
        }),
      });
    } finally {
      setIsSavingEditFlyout(false);
      setIsProcessing(false);
    }
  };

  const handleSaveAsNew = async () => {
    if (!deleteContext || !currentPolicy.current) return;
    pendingNewPolicyEsPhasesRef.current = getModifiedPhases(
      currentPolicy.current,
      deleteContext
    ) as any;
    setCreatePolicyBackModal('delete');
    setActiveModal('createPolicy');
  };

  const handleSaveEditsAsNew = async () => {
    const nextEsPhases = pendingEditEsPhasesRef.current;
    if (!nextEsPhases) return;
    pendingNewPolicyEsPhasesRef.current = nextEsPhases;
    setCreatePolicyBackModal('edit');
    setActiveModal('createPolicy');
  };

  const handleCreatePolicy = async (newPolicyName: string) => {
    if (!isIlm) {
      return;
    }

    try {
      setIsProcessing(true);

      await fetchPolicies();
      if (!currentPolicy.current) {
        throw new Error('Policy not found');
      }

      const nextEsPhases =
        pendingNewPolicyEsPhasesRef.current ??
        (deleteContext ? (getModifiedPhases(currentPolicy.current, deleteContext) as any) : null);
      if (!nextEsPhases) {
        throw new Error('Missing pending phases for new policy');
      }

      // Validate that the new policy has a hot phase - required for new ILM policies
      if (!Object.prototype.hasOwnProperty.call(nextEsPhases, 'hot') || nextEsPhases.hot == null) {
        notifications.toasts.addWarning({
          title: i18n.translate('xpack.streams.lifecycleSummary.cannotCreateWithoutHot', {
            defaultMessage: 'Cannot create policy without hot phase',
          }),
          text: i18n.translate('xpack.streams.lifecycleSummary.cannotCreateWithoutHotDescription', {
            defaultMessage: 'A new ILM policy must include a hot phase.',
          }),
        });
        setIsProcessing(false);
        return;
      }

      // Strip the 'managed' field from _meta when creating a new policy
      const { managed: _managed, ...restMeta } = currentPolicy.current._meta ?? {};

      const updatedPolicy: IlmPolicy = {
        name: newPolicyName,
        phases: nextEsPhases as any,
        _meta: restMeta,
      };

      await saveIlmPolicy(updatedPolicy);

      await updateStreamLifecycle({ ilm: { policy: newPolicyName } });

      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.streams.lifecycleSummary.newPolicyCreated', {
          defaultMessage: 'New ILM policy created and assigned to stream',
        }),
      });

      await Promise.resolve(refreshDefinition?.());
      refreshIlmStats();
      handleCancelModal();
      closeEditFlyout();
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
    setActiveModal(createPolicyBackModal ?? 'delete');
  };

  const openEditFlyout = async ({
    phaseName,
    isAddingNewPhase = false,
  }: {
    phaseName?: PhaseName;
    isAddingNewPhase?: boolean;
  }) => {
    if (!isIlm) {
      return;
    }

    try {
      await fetchPolicies();
      if (!currentPolicy.current) {
        throw new Error('Policy not found');
      }

      // Pass ES format directly to the flyout
      setEditFlyoutInitialPhases(currentPolicy.current.phases);
      if (isAddingNewPhase && phaseName) {
        // When adding a new phase, use phaseToEnableOnOpen to enable and select it
        setEditFlyoutPhaseToEnableOnOpen(phaseName);
        setEditFlyoutInitialSelectedPhase(undefined);
      } else {
        // When editing an existing phase, use initialSelectedPhase to select it
        setEditFlyoutInitialSelectedPhase(phaseName);
        setEditFlyoutPhaseToEnableOnOpen(undefined);
      }
      setEditingPhase(phaseName);
      setIsEditFlyoutOpen(true);
    } catch (error) {
      notifications.toasts.addError(error as Error, {
        title: i18n.translate('xpack.streams.lifecycleSummary.policyLoadFailed', {
          defaultMessage: 'Failed to load ILM policy details',
        }),
      });
    }
  };

  const closeEditFlyout = () => {
    setIsEditFlyoutOpen(false);
    setEditFlyoutInitialPhases(null);
    setEditFlyoutInitialSelectedPhase(undefined);
    setEditFlyoutPhaseToEnableOnOpen(undefined);
    setPreviewPhases(null);
    setEditingPhase(undefined);
  };

  const handleFlyoutSave = async (nextPhases: IlmPolicyPhases) => {
    if (!isIlm) return;

    try {
      await fetchPolicies();
      if (!currentPolicy.current) {
        throw new Error('Policy not found');
      }

      const resources = buildAffectedResources(currentPolicy.current);
      const isManaged = currentPolicy.current._meta?.managed === true;

      // No transformation needed - flyout already returns ES format
      pendingEditEsPhasesRef.current = nextPhases;

      if (resources.length === 0 && !isManaged) {
        await overwriteEditPolicy();
        return;
      }

      setEditContext({ isManaged });
      setActiveModal('edit');
    } catch (error) {
      notifications.toasts.addError(error as Error, {
        title: i18n.translate('xpack.streams.lifecycleSummary.policyUpdateFailed', {
          defaultMessage: 'Failed to update ILM policy',
        }),
      });
    }
  };

  // Get the currently selected phases from the policy
  const getSelectedPhases = (): PhaseName[] => {
    if (!isIlm || !ilmStatsValue?.phases) {
      return [];
    }

    const phases: PhaseName[] = [];
    const allPhases: PhaseName[] = ['hot', 'warm', 'cold', 'frozen', 'delete'];

    for (const phaseName of allPhases) {
      if ((ilmStatsValue.phases as any)[phaseName]) {
        phases.push(phaseName);
      }
    }

    return phases;
  };

  // Handler to add a new ILM phase
  const handleAddIlmPhase = (phase: PhaseName) => {
    openEditFlyout({ phaseName: phase, isAddingNewPhase: true });
  };

  const handleNavigateToSnapshotRepositories = () => {
    application.navigateToApp('management', {
      path: '/data/snapshot_restore/repositories',
      openInNewTab: true,
    });
  };

  const getPhases = (): LifecyclePhase[] => {
    if (!isIlm) {
      return [];
    }

    const basePhasesWithGrow = getILMRatios(ilmStatsValue);
    if (!basePhasesWithGrow) {
      return [];
    }

    const baseByName = new Map<string, any>(basePhasesWithGrow.map((p) => [p.name, p]));
    const orderedForPreview =
      previewPhases != null ? getILMRatios({ phases: previewPhases }) ?? [] : basePhasesWithGrow;

    const effective = previewPhases ?? (ilmStatsValue?.phases as IlmPolicyPhases | undefined);
    const effectiveByName = new Map<string, any>();
    if (effective) {
      (['hot', 'warm', 'cold', 'frozen', 'delete'] as PhaseName[]).forEach((name) => {
        const phase = (effective as any)[name];
        if (phase) effectiveByName.set(name, phase);
      });
    }

    const totalDocs = stats?.totalDocs ?? 0;
    const totalSize = basePhasesWithGrow.reduce<number>((sum, phase) => {
      const size =
        typeof phase === 'object' && phase !== null && 'size_in_bytes' in phase
          ? typeof phase.size_in_bytes === 'number'
            ? phase.size_in_bytes
            : 0
          : 0;
      return sum + size;
    }, 0);
    const nonDeletePhases = orderedForPreview.filter((phase) => phase.name !== 'delete');
    const isLastNonDeletePhase = nonDeletePhases.length === 1;

    return orderedForPreview.map((phase, index) => {
      const base = baseByName.get(phase.name) ?? phase;
      const edited = effectiveByName.get(phase.name);

      // Estimate doc count based on size ratio
      const phaseSize = 'size_in_bytes' in base ? base.size_in_bytes : 0;
      const estimatedDocs =
        totalSize > 0 && totalDocs > 0
          ? Math.round((phaseSize / totalSize) * totalDocs)
          : undefined;

      // Get readonly and searchable_snapshot from effective phase data (preview if present)
      const hasReadonlyAction = edited
        ? Boolean(edited.readonly)
        : 'readonly' in base && base.readonly === true;
      const searchableSnapshotAction = edited
        ? (edited.searchable_snapshot as string | undefined)
        : 'searchable_snapshot' in base
        ? base.searchable_snapshot
        : undefined;

      const downsampleValue = edited
        ? (edited.downsample as any)
        : 'downsample' in base
        ? base.downsample
        : undefined;

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
        size: 'size_in_bytes' in base ? formatBytes(base.size_in_bytes) : undefined,
        grow: phase.grow,
        isDelete: phase.name === 'delete',
        timelineValue: orderedForPreview[index + 1]?.min_age,
        description: ilmPhases[phase.name].description,
        sizeInBytes: 'size_in_bytes' in base ? base.size_in_bytes : undefined,
        docsCount: estimatedDocs,
        min_age: edited?.min_age ?? phase.min_age,
        isReadOnly: hasReadonlyAction,
        downsample: downsampleValue,
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

      {activeModal === 'edit' && editContext && (
        <EditPolicyModal
          affectedResources={affectedResources}
          isManaged={editContext.isManaged}
          isProcessing={isProcessing}
          onCancel={() => {
            setActiveModal(null);
            setEditContext(null);
            pendingEditEsPhasesRef.current = null;
            setCreatePolicyBackModal(null);
          }}
          onOverwrite={overwriteEditPolicy}
          onSaveAsNew={handleSaveEditsAsNew}
        />
      )}

      {activeModal === 'createPolicy' && (
        <CreatePolicyModal
          policyNames={policyNames}
          onBack={handleBackFromCreatePolicy}
          onSave={handleCreatePolicy}
          isLoading={isProcessing}
        />
      )}

      {isEditFlyoutOpen && editFlyoutInitialPhases && (
        <EditIlmPhasesFlyout
          initialPhases={editFlyoutInitialPhases}
          initialSelectedPhase={editFlyoutInitialSelectedPhase}
          phaseToEnableOnOpen={editFlyoutPhaseToEnableOnOpen}
          onSelectedPhaseChange={setEditingPhase}
          onChange={(next) => setPreviewPhases(next)}
          onSave={handleFlyoutSave}
          onClose={closeEditFlyout}
          isSaving={isSavingEditFlyout}
          searchableSnapshotRepositories={snapshotRepositories}
          isLoadingSearchableSnapshotRepositories={isLoadingSnapshotRepositories}
          onRefreshSearchableSnapshotRepositories={refreshSnapshotRepositories}
          onCreateSnapshotRepository={handleNavigateToSnapshotRepositories}
          data-test-subj="streamsEditIlmPhasesFlyoutFromSummary"
        />
      )}
    </>
  ) : null;

  return {
    phases: getPhases(),
    loading: isIlm && ilmLoading,
    onRemovePhase: isIlm ? handleRemovePhase : undefined,
    onRemoveDownsampleStep: isIlm ? handleRemoveIlmDownsampleStep : undefined,
    onEditPhase: isIlm ? (phaseName) => openEditFlyout({ phaseName }) : undefined,
    onEditDownsampleStep: isIlm
      ? (_stepNumber, phaseName) => openEditFlyout({ phaseName })
      : undefined,
    editingPhase,
    modals,
    ilmSelectedPhasesForAdd: isIlm ? getSelectedPhases() : undefined,
    onAddIlmPhase: isIlm ? handleAddIlmPhase : undefined,
  };
};
