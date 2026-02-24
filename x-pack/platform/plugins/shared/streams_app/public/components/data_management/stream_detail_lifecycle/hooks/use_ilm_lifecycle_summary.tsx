/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useReducer, useRef } from 'react';
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
import { isEqual } from 'lodash';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';
import { useKibana } from '../../../../hooks/use_kibana';
import { useIlmPhasesColorAndDescription } from './use_ilm_phases_color_and_description';
import type { DataStreamStats } from './use_data_stream_stats';
import { EditPolicyModal } from '../downsampling/edit_policy_modal/edit_policy_modal';
import { CreatePolicyModal } from '../downsampling/create_new_policy_modal/create_new_policy_modal';
import { EditIlmPhasesFlyout } from '../downsampling/edit_ilm_phases_flyout';
import {
  createIlmPhasesFlyoutDeserializer,
  createIlmPhasesFlyoutSerializer,
} from '../downsampling/edit_ilm_phases_flyout/form';
import type { LifecyclePhase } from '../common/data_lifecycle/lifecycle_types';
import { useSnapshotRepositories } from './use_snapshot_repositories';
import {
  buildModifiedPhasesFromEdit,
  getModifiedPhases,
  type DeleteContext,
  type EsIlmPolicyPhases,
} from './ilm_policy_phase_helpers';
import {
  buildAffectedResources,
  buildLifecycleSummaryPhases,
  getSelectedIlmPhases,
} from './ilm_lifecycle_summary_helpers';
import {
  initialLifecycleSummaryUiState,
  lifecycleSummaryUiReducer,
} from './use_ilm_lifecycle_summary_state';

interface UseIlmLifecycleSummaryProps {
  definition: Streams.ingest.all.GetResponse;
  stats?: DataStreamStats;
  refreshDefinition?: () => void;
  updateStreamLifecycle: (lifecycle: IngestStreamLifecycle) => Promise<void>;
  isMetricsStream: boolean;
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
  ilmExcludedPhasesForAdd?: PhaseName[];
  onAddIlmPhase?: (phase: PhaseName) => void;
  isEditLifecycleFlyoutOpen: boolean;
  hasUnsavedEditLifecycleFlyoutChanges: boolean;
}

export const useIlmLifecycleSummary = ({
  definition,
  stats,
  refreshDefinition,
  updateStreamLifecycle,
  isMetricsStream,
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

  const isIlm = isIlmLifecycle(definition.effective_lifecycle);
  const policyName = isIlm
    ? (definition.effective_lifecycle as { ilm: { policy: string } }).ilm.policy
    : '';

  const [uiState, dispatchUi] = useReducer(
    lifecycleSummaryUiReducer,
    initialLifecycleSummaryUiState
  );
  const {
    repositories: snapshotRepositories,
    hasFetched: hasFetchedSnapshotRepositories,
    isLoading: isLoadingSnapshotRepositories,
    refresh: refreshSnapshotRepositories,
  } = useSnapshotRepositories({ enabled: uiState.isEditLifecycleFlyoutOpen });

  const canCreateRepository = definition.privileges.create_snapshot_repository;
  const currentPolicy = useRef<IlmPolicyWithUsage | null>(null);

  const getCanonicalFlyoutInitialPhases = (initialPhases: IlmPolicyPhases): IlmPolicyPhases => {
    const deserializer = createIlmPhasesFlyoutDeserializer();
    const serializer = createIlmPhasesFlyoutSerializer(initialPhases);
    return serializer(deserializer(initialPhases));
  };

  const affectedResources = currentPolicy.current
    ? buildAffectedResources(currentPolicy.current, definition.stream.name)
    : [];

  const fetchPolicies = async () => {
    const policies = await streamsRepositoryClient.fetch(
      'GET /internal/streams/lifecycle/_policies',
      { signal }
    );
    const foundPolicy = policies.find((policy) => policy.name === policyName);
    currentPolicy.current = foundPolicy ?? null;
    dispatchUi({ type: 'setPolicyNames', payload: policies.map((policy) => policy.name) });
  };

  const handleCancelModal = () => {
    dispatchUi({ type: 'closeModals' });
  };

  const saveIlmPolicy = async (
    policy: Pick<IlmPolicy, 'name' | 'meta' | 'deprecated'> & { phases: EsIlmPolicyPhases },
    allowOverwrite = false,
    sourcePolicyName?: string
  ) => {
    await streamsRepositoryClient.fetch('POST /internal/streams/lifecycle/_policy', {
      params: {
        query: {
          allow_overwrite: allowOverwrite,
        },
        body: {
          name: policy.name,
          phases: policy.phases,
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
      dispatchUi({ type: 'setIsProcessing', payload: true });

      if (!currentPolicy.current) {
        throw new Error('Policy not found');
      }

      const modifiedPhases = getModifiedPhases(currentPolicy.current, context);
      const updatedPolicy = {
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
      dispatchUi({ type: 'setIsProcessing', payload: false });
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

      const resources = buildAffectedResources(currentPolicy.current, definition.stream.name);
      const isManaged = currentPolicy.current.meta?.managed === true;

      if (resources.length === 0 && !isManaged) {
        applyOverwrite(context);
        return;
      }

      dispatchUi({
        type: 'openDeleteModal',
        payload: {
          ...context,
          isManaged,
        },
      });
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
    if (!uiState.deleteContext) {
      return;
    }
    applyOverwrite(uiState.deleteContext);
  };

  const overwriteEditPolicy = async (esPhasesOverride?: EsIlmPolicyPhases) => {
    if (!isIlm) return;

    const nextEsPhases = esPhasesOverride ?? uiState.pendingEditEsPhases;
    if (!nextEsPhases) return;

    try {
      dispatchUi({ type: 'setIsSavingEditFlyout', payload: true });
      dispatchUi({ type: 'setIsProcessing', payload: true });

      await fetchPolicies();
      if (!currentPolicy.current) {
        throw new Error('Policy not found');
      }

      const updatedPolicy = {
        name: policyName,
        phases: nextEsPhases,
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
      closeEditFlyout();
    } catch (error) {
      notifications.toasts.addError(error as Error, {
        title: i18n.translate('xpack.streams.lifecycleSummary.policyUpdateFailed', {
          defaultMessage: 'Failed to update ILM policy',
        }),
      });
    } finally {
      dispatchUi({ type: 'setIsSavingEditFlyout', payload: false });
      dispatchUi({ type: 'setIsProcessing', payload: false });
    }
  };

  const handleSaveAsNew = async () => {
    if (!uiState.deleteContext || !currentPolicy.current) return;
    dispatchUi({
      type: 'setPendingNewPolicyEsPhases',
      payload: getModifiedPhases(currentPolicy.current, uiState.deleteContext),
    });
    dispatchUi({ type: 'openCreatePolicyModal', payload: 'delete' });
  };

  const handleSaveEditsAsNew = async () => {
    const nextEsPhases = uiState.pendingEditEsPhases;
    if (!nextEsPhases) return;
    dispatchUi({ type: 'setPendingNewPolicyEsPhases', payload: nextEsPhases });
    dispatchUi({ type: 'openCreatePolicyModal', payload: 'edit' });
  };

  const handleCreatePolicy = async (newPolicyName: string) => {
    const nextEsPhases = uiState.pendingNewPolicyEsPhases;
    if (!isIlm || !nextEsPhases) {
      return;
    }

    try {
      dispatchUi({ type: 'setIsProcessing', payload: true });

      await fetchPolicies();
      if (!currentPolicy.current) {
        throw new Error('Policy not found');
      }

      const originalHasHot = Boolean(currentPolicy.current.phases.hot);
      if (originalHasHot && !('hot' in nextEsPhases)) {
        notifications.toasts.addWarning({
          title: i18n.translate('xpack.streams.lifecycleSummary.cannotCreateWithoutHot', {
            defaultMessage: 'Cannot create policy without hot phase',
          }),
          text: i18n.translate('xpack.streams.lifecycleSummary.cannotCreateWithoutHotDescription', {
            defaultMessage:
              'The original policy includes a hot phase. A cloned policy must also include it.',
          }),
        });
        dispatchUi({ type: 'setIsProcessing', payload: false });
        return;
      }

      // Strip the 'managed' field from meta when creating a new policy
      const { managed: _managed, ...restMeta } = currentPolicy.current.meta ?? {};

      const updatedPolicy = {
        name: newPolicyName,
        phases: nextEsPhases,
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
      closeEditFlyout();
    } catch (error) {
      notifications.toasts.addError(error as Error, {
        title: i18n.translate('xpack.streams.lifecycleSummary.newPolicyFailed', {
          defaultMessage: 'Failed to create new ILM policy',
        }),
      });
    } finally {
      dispatchUi({ type: 'setIsProcessing', payload: false });
    }
  };

  const handleBackFromCreatePolicy = () => {
    dispatchUi({ type: 'showBackModalFromCreatePolicy' });
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

    // If the flyout is already open, just navigate to the phase tab.
    // The flyout's ensurePhaseEnabledWithDefaults will enable it if needed.
    if (uiState.isEditLifecycleFlyoutOpen) {
      dispatchUi({ type: 'setEditingPhase', payload: phaseName });
      return;
    }

    try {
      await fetchPolicies();
      if (!currentPolicy.current) {
        throw new Error('Policy not found');
      }

      // Pass the policy phases to the flyout. The flyout deserializer normalizes
      // the phases into form state defaults.
      dispatchUi({
        type: 'openEditFlyout',
        payload: {
          initialPhases: currentPolicy.current.phases,
          canonicalInitialPhases: getCanonicalFlyoutInitialPhases(currentPolicy.current.phases),
          editingPhase: phaseName,
        },
      });
    } catch (error) {
      notifications.toasts.addError(error as Error, {
        title: i18n.translate('xpack.streams.lifecycleSummary.policyLoadFailed', {
          defaultMessage: 'Failed to load ILM policy details',
        }),
      });
    }
  };

  const closeEditFlyout = () => {
    dispatchUi({ type: 'closeEditFlyout' });
  };

  const handleFlyoutSave = async (nextPhases: IlmPolicyPhases) => {
    if (!isIlm) return;

    try {
      await fetchPolicies();
      if (!currentPolicy.current) {
        throw new Error('Policy not found');
      }

      const resources = buildAffectedResources(currentPolicy.current, definition.stream.name);
      const isManaged = currentPolicy.current.meta?.managed === true;

      const modifiedPhases = buildModifiedPhasesFromEdit(currentPolicy.current, nextPhases);

      if (resources.length === 0 && !isManaged) {
        await overwriteEditPolicy(modifiedPhases);
        return;
      }

      dispatchUi({ type: 'setPendingEditEsPhases', payload: modifiedPhases });
      dispatchUi({ type: 'openEditModal', payload: { isManaged } });
    } catch (error) {
      notifications.toasts.addError(error as Error, {
        title: i18n.translate('xpack.streams.lifecycleSummary.policyUpdateFailed', {
          defaultMessage: 'Failed to update ILM policy',
        }),
      });
    }
  };

  // Handler to add a new ILM phase
  const handleAddIlmPhase = (phase: PhaseName) => {
    openEditFlyout({ phaseName: phase });
  };

  const handleNavigateToSnapshotRepositories = () => {
    application.navigateToApp('management', {
      path: '/data/snapshot_restore/repositories',
      openInNewTab: true,
    });
  };

  const phases: LifecyclePhase[] = isIlm
    ? buildLifecycleSummaryPhases({
        isEditLifecycleFlyoutOpen: uiState.isEditLifecycleFlyoutOpen,
        previewPhases: uiState.previewPhases,
        ilmStatsPhases: ilmStatsValue?.phases,
        stats,
        ilmPhases,
      })
    : [];

  const selectedPhasesForAdd: PhaseName[] = isIlm
    ? getSelectedIlmPhases({
        isEditLifecycleFlyoutOpen: uiState.isEditLifecycleFlyoutOpen,
        previewPhases: uiState.previewPhases,
        editFlyoutInitialPhases: uiState.editFlyoutInitialPhases,
        ilmStatsPhases: ilmStatsValue?.phases,
      })
    : [];

  const hasUnsavedEditLifecycleFlyoutChanges =
    uiState.isEditLifecycleFlyoutOpen &&
    uiState.previewPhases != null &&
    uiState.editFlyoutCanonicalInitialPhases != null &&
    !isEqual(uiState.previewPhases, uiState.editFlyoutCanonicalInitialPhases);

  const modals = isIlm ? (
    <>
      {uiState.activeModal === 'delete' && uiState.deleteContext && (
        <EditPolicyModal
          affectedResources={affectedResources}
          isManaged={uiState.deleteContext?.isManaged}
          isProcessing={uiState.isProcessing}
          onCancel={handleCancelModal}
          onOverwrite={handleOverwrite}
          onSaveAsNew={handleSaveAsNew}
        />
      )}

      {uiState.activeModal === 'edit' && uiState.editContext && (
        <EditPolicyModal
          affectedResources={affectedResources}
          isManaged={uiState.editContext.isManaged}
          isProcessing={uiState.isProcessing}
          onCancel={() => dispatchUi({ type: 'clearEditModalState' })}
          onOverwrite={overwriteEditPolicy}
          onSaveAsNew={handleSaveEditsAsNew}
        />
      )}

      {uiState.activeModal === 'createPolicy' && (
        <CreatePolicyModal
          policyNames={uiState.policyNames}
          onBack={handleBackFromCreatePolicy}
          onSave={handleCreatePolicy}
          isLoading={uiState.isProcessing}
          originalPolicyName={policyName}
        />
      )}

      {uiState.isEditLifecycleFlyoutOpen && uiState.editFlyoutInitialPhases && (
        <EditIlmPhasesFlyout
          initialPhases={uiState.editFlyoutInitialPhases}
          selectedPhase={uiState.editingPhase}
          setSelectedPhase={(phase) => dispatchUi({ type: 'setEditingPhase', payload: phase })}
          onChange={(next) => dispatchUi({ type: 'setPreviewPhases', payload: next })}
          onSave={handleFlyoutSave}
          onClose={closeEditFlyout}
          isSaving={uiState.isSavingEditFlyout}
          canCreateRepository={canCreateRepository}
          searchableSnapshotRepositories={snapshotRepositories}
          isLoadingSearchableSnapshotRepositories={isLoadingSnapshotRepositories}
          onRefreshSearchableSnapshotRepositories={refreshSnapshotRepositories}
          onCreateSnapshotRepository={handleNavigateToSnapshotRepositories}
          data-test-subj="streamsEditIlmPhasesFlyoutFromSummary"
          isMetricsStream={isMetricsStream}
        />
      )}
    </>
  ) : null;

  // Exclude frozen from the external "Add phase" dropdown when no snapshot repositories
  // are available and the user cannot create one, matching the flyout's own PhaseTabsRow behaviour.
  // If we haven't fetched yet, allow selecting frozen; the flyout will fetch and validate.
  const canSelectFrozen =
    canCreateRepository || !hasFetchedSnapshotRepositories || snapshotRepositories.length > 0;
  const ilmExcludedPhasesForAdd: PhaseName[] = canSelectFrozen ? [] : ['frozen'];

  return {
    phases,
    loading: isIlm && ilmLoading,
    onRemovePhase: isIlm ? handleRemovePhase : undefined,
    onRemoveDownsampleStep: isIlm ? handleRemoveIlmDownsampleStep : undefined,
    onEditPhase: isIlm ? (phaseName) => openEditFlyout({ phaseName }) : undefined,
    onEditDownsampleStep: isIlm
      ? (_stepNumber, phaseName) => openEditFlyout({ phaseName })
      : undefined,
    editingPhase: uiState.editingPhase,
    modals,
    ilmSelectedPhasesForAdd: isIlm ? selectedPhasesForAdd : undefined,
    ilmExcludedPhasesForAdd: isIlm ? ilmExcludedPhasesForAdd : undefined,
    onAddIlmPhase: isIlm ? handleAddIlmPhase : undefined,
    isEditLifecycleFlyoutOpen: uiState.isEditLifecycleFlyoutOpen,
    hasUnsavedEditLifecycleFlyoutChanges,
  };
};
