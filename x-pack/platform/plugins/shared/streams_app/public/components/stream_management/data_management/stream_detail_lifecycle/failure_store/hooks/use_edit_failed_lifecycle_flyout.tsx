/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Streams } from '@kbn/streams-schema';
import { useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  buildFailedDataLifecycleApplyPayload,
  EditFailedDataLifecycleFlyoutBody,
  FlyoutFooterWithRetentionWarning,
} from '@kbn/data-lifecycle-phases';
import type { useDataStreamStats } from '../../hooks/use_data_stream_stats';
import type { useFailureStoreConfig } from '../../hooks/use_failure_store_config';
import type { EditDeletePhaseFlyoutValue } from '../../data_phases/edit_delete_phase_flyout';
import { EditDeletePhaseFlyout } from '../../data_phases/edit_delete_phase_flyout';
import { useLifecyclePreview } from '../../common/hooks/lifecycle_preview';
import { useInheritedStreamResource } from '../../common/hooks/use_inherited_stream_resource';
import { useInheritLink } from '../../common/hooks/use_inherit_link';
import { useOverrideSettingsConfirmation } from '../../common/hooks/use_override_settings_confirmation';
import { LifecycleFlyout } from '../../common/lifecycle_flyout';
import type { useKibana } from '../../../../../../hooks/use_kibana';
import { getFormattedError } from '../../../../../../util/errors';

type FailureStoreConfig = ReturnType<typeof useFailureStoreConfig>;
type KibanaContext = ReturnType<typeof useKibana>;

export interface UseEditFailedLifecycleFlyoutArgs {
  definition: Streams.ingest.all.GetResponse;
  data: ReturnType<typeof useDataStreamStats>;
  refreshDefinition: () => void;
  failureStoreConfig: FailureStoreConfig;
  kibana: KibanaContext;
  manageFailureStorePrivilege: boolean;
  updateFailureStore: (
    streamName: string,
    failureStore: Streams.ingest.all.GetResponse['stream']['ingest']['failure_store']
  ) => Promise<unknown>;
  isExternalFlyoutOpen?: boolean;
  onFlyoutOpenChange?: (isOpen: boolean) => void;
}

const getInheritedFailureStoreEnabled = (
  inheritedFailureStore: Streams.ingest.all.GetResponse['effective_failure_store'] | null
): boolean => {
  return Boolean(inheritedFailureStore && !('disabled' in inheritedFailureStore));
};

const getInheritedFailureStoreRetention = (
  inheritedFailureStore: Streams.ingest.all.GetResponse['effective_failure_store']
): string | undefined => {
  const inheritedEnabled = !('disabled' in inheritedFailureStore);
  if (
    inheritedEnabled &&
    'lifecycle' in inheritedFailureStore &&
    'enabled' in inheritedFailureStore.lifecycle
  ) {
    return inheritedFailureStore.lifecycle.enabled.data_retention;
  }
  return undefined;
};

/**
 * Whether the inherited failure store has its lifecycle enabled (i.e. it has a
 * delete phase, even if the retention is the default and therefore not echoed
 * back with an explicit `data_retention`). A `lifecycle.disabled` failure store
 * means infinite retention (no delete phase).
 */
const getInheritedFailureStoreLifecycleEnabled = (
  inheritedFailureStore: Streams.ingest.all.GetResponse['effective_failure_store']
): boolean => {
  return (
    !('disabled' in inheritedFailureStore) &&
    'lifecycle' in inheritedFailureStore &&
    'enabled' in inheritedFailureStore.lifecycle
  );
};

export const useEditFailedLifecycleFlyout = ({
  definition,
  data,
  refreshDefinition,
  failureStoreConfig,
  kibana,
  manageFailureStorePrivilege,
  updateFailureStore,
  isExternalFlyoutOpen = false,
  onFlyoutOpenChange,
}: UseEditFailedLifecycleFlyoutArgs) => {
  const {
    core: { notifications, http },
    isServerless,
  } = kibana;

  const {
    failureStoreEnabled,
    defaultRetentionPeriod,
    customRetentionPeriod,
    inheritOptions,
    retentionDisabled,
  } = failureStoreConfig;

  // The cluster default retention is not always known on the client (e.g. in
  // Serverless `cluster.getSettings` is not available), so fall back to the
  // failure store default of 30d. This mirrors the behaviour of the previous
  // failure store modal, which always offered a default to restore.
  const effectiveDefaultRetentionPeriod = defaultRetentionPeriod ?? '30d';

  const {
    setIsActive: setPreviewIsActive,
    setRetentionPeriod: setPreviewRetentionPeriod,
    setDataPhasesCount: setPreviewDataPhasesCount,
    clearPreview: clearLifecyclePreview,
  } = useLifecyclePreview();

  const titleId = useGeneratedHtmlId({ prefix: 'streamsEditFailedDataLifecycleFlyoutTitle' });

  const { confirmOverride, modal: overrideModal } = useOverrideSettingsConfirmation({
    definition,
    isCurrentlyInherited: inheritOptions.isCurrentlyInherited,
    forceDlm: true,
  });

  const [isMainFlyoutOpen, setIsMainFlyoutOpen] = useState(false);
  const [isDeletePhaseFlyoutOpen, setIsDeletePhaseFlyoutOpen] = useState(false);
  const [inheritLifecycle, setInheritLifecycle] = useState(inheritOptions.isCurrentlyInherited);
  const [failureStoreEnabledDraft, setFailureStoreEnabledDraft] = useState(failureStoreEnabled);
  const [isSaving, setIsSaving] = useState(false);

  const inheritedFetchEnabled =
    isMainFlyoutOpen && inheritOptions.canShowInherit && inheritLifecycle;

  const { data: inheritedFailureStore, reset: resetInheritedFailureStore } =
    useInheritedStreamResource({
      http,
      path: `/internal/streams/${encodeURIComponent(
        definition.stream.name
      )}/failure_store/_inherited`,
      enabled: inheritedFetchEnabled,
      mapResponse: (response) =>
        (response as { failure_store: Streams.ingest.all.GetResponse['effective_failure_store'] })
          .failure_store,
    });

  const isAnyFlyoutOpenInternal = isMainFlyoutOpen || isDeletePhaseFlyoutOpen;
  const isAnyFlyoutOpen = isAnyFlyoutOpenInternal || Boolean(isExternalFlyoutOpen);

  const failureStoreEnabledForUi = isMainFlyoutOpen
    ? inheritLifecycle
      ? inheritedFailureStore
        ? getInheritedFailureStoreEnabled(inheritedFailureStore)
        : failureStoreEnabled
      : failureStoreEnabledDraft
    : failureStoreEnabled;

  const openMainFlyout = useCallback(() => {
    // Only one lifecycle flyout may be open at a time in this tab. The trigger
    // buttons are already disabled while another flyout is open, but guard here
    // too so a stale/duplicate call can't open a second flyout on top.
    if (isDeletePhaseFlyoutOpen || isExternalFlyoutOpen) {
      return;
    }
    setInheritLifecycle(inheritOptions.isCurrentlyInherited);
    setFailureStoreEnabledDraft(failureStoreEnabled);
    resetInheritedFailureStore();
    setIsMainFlyoutOpen(true);
  }, [
    failureStoreEnabled,
    inheritOptions.isCurrentlyInherited,
    isDeletePhaseFlyoutOpen,
    isExternalFlyoutOpen,
    resetInheritedFailureStore,
  ]);

  const closeMainFlyout = useCallback(() => {
    setIsMainFlyoutOpen(false);
  }, []);

  const onChangeInheritLifecycle = useCallback(
    (next: boolean) => {
      setInheritLifecycle(next);
      if (next) {
        resetInheritedFailureStore();
        return;
      }
      if (!isDeletePhaseFlyoutOpen) {
        clearLifecyclePreview();
      }
    },
    [clearLifecyclePreview, isDeletePhaseFlyoutOpen, resetInheritedFailureStore]
  );

  useEffect(() => {
    if (!isMainFlyoutOpen || !inheritLifecycle || !inheritedFailureStore) {
      return;
    }
    setFailureStoreEnabledDraft(getInheritedFailureStoreEnabled(inheritedFailureStore));
  }, [inheritLifecycle, inheritedFailureStore, isMainFlyoutOpen]);

  const syncDeletePhasePreview = useCallback(
    (retention: string | null) => {
      setPreviewIsActive(true);
      setPreviewRetentionPeriod(retention);
      setPreviewDataPhasesCount(retention ? 2 : 1);
    },
    [setPreviewDataPhasesCount, setPreviewIsActive, setPreviewRetentionPeriod]
  );

  const mainFlyoutPreview = useMemo(() => {
    if (!isMainFlyoutOpen || isDeletePhaseFlyoutOpen) {
      return null;
    }
    if (inheritLifecycle) {
      if (!inheritedFailureStore) {
        return null;
      }
      // When the inherited lifecycle is enabled but uses the default retention,
      // no explicit `data_retention` is echoed back; fall back to the default so
      // the preview still shows a delete phase.
      const lifecycleEnabled = getInheritedFailureStoreLifecycleEnabled(inheritedFailureStore);
      const retention = lifecycleEnabled
        ? getInheritedFailureStoreRetention(inheritedFailureStore) ??
          effectiveDefaultRetentionPeriod
        : null;
      return { retention, dataPhasesCount: retention ? 2 : 1 };
    }
    if (!failureStoreEnabledDraft) {
      return 'clear' as const;
    }
    // Enabling the failure store applies the default lifecycle, which includes a
    // delete phase, so preview the default retention.
    return { retention: effectiveDefaultRetentionPeriod, dataPhasesCount: 2 };
  }, [
    effectiveDefaultRetentionPeriod,
    failureStoreEnabledDraft,
    inheritLifecycle,
    inheritedFailureStore,
    isDeletePhaseFlyoutOpen,
    isMainFlyoutOpen,
  ]);

  useEffect(() => {
    if (!isMainFlyoutOpen || isDeletePhaseFlyoutOpen) {
      return;
    }
    if (mainFlyoutPreview === null) {
      return;
    }
    if (mainFlyoutPreview === 'clear') {
      clearLifecyclePreview();
      return;
    }
    syncDeletePhasePreview(mainFlyoutPreview.retention);
  }, [
    clearLifecyclePreview,
    isDeletePhaseFlyoutOpen,
    isMainFlyoutOpen,
    mainFlyoutPreview,
    syncDeletePhasePreview,
  ]);

  const failedInheritLabel = inheritOptions.isWired
    ? i18n.translate('xpack.streams.editFailedLifecycle.inheritFromParentLabel', {
        defaultMessage: 'Inherit lifecycle from parent stream',
      })
    : i18n.translate('xpack.streams.editFailedLifecycle.inheritFromIndexTemplateLabel', {
        defaultMessage: 'Inherit lifecycle from index template',
      });

  const failedInheritLink = useInheritLink(definition, {
    classicIndexTemplate: i18n.translate(
      'xpack.streams.editFailedLifecycle.viewIndexTemplateLinkLabel',
      { defaultMessage: 'View index template' }
    ),
    wiredParentStream: i18n.translate(
      'xpack.streams.editFailedLifecycle.viewParentStreamLinkLabel',
      { defaultMessage: 'View parent stream' }
    ),
  });

  const showSaveSuccess = useCallback(() => {
    notifications.toasts.addSuccess({
      title: i18n.translate('xpack.streams.streamDetailFailureStore.updateFailureStoreSuccess', {
        defaultMessage: 'Failure store settings saved',
      }),
    });
  }, [notifications.toasts]);

  const performSaveMainFlyout = async () => {
    try {
      setIsSaving(true);
      const payload = buildFailedDataLifecycleApplyPayload({
        inheritLifecycle,
        failureStoreEnabled: failureStoreEnabledDraft,
      });

      const nextFailureStore =
        payload.inheritLifecycle === true
          ? { inherit: {} }
          : payload.failureStoreEnabled
          ? payload.retention
            ? { lifecycle: { enabled: { data_retention: payload.retention } } }
            : // Enabling the failure store without an explicit retention applies the
              // default lifecycle retention. Disabling the lifecycle (infinite
              // retention) is not a valid outcome of enabling and is unsupported in
              // Serverless.
              { lifecycle: { enabled: {} } }
          : { disabled: {} };

      await updateFailureStore(definition.stream.name, nextFailureStore);
      refreshDefinition();
      showSaveSuccess();
    } catch (error) {
      notifications.toasts.addError(getFormattedError(error), {
        title: i18n.translate('xpack.streams.streamDetailFailureStore.updateFailureStoreFailed', {
          defaultMessage: "We couldn't update the failure store settings.",
        }),
      });
    } finally {
      setIsSaving(false);
      closeMainFlyout();
      data.refresh();
    }
  };

  const saveMainFlyout = () => {
    // Re-inheriting does not override the index template, so it never needs
    // confirmation.
    if (inheritLifecycle) {
      performSaveMainFlyout();
      return;
    }
    confirmOverride(() => performSaveMainFlyout());
  };

  const failedDeletePhaseInitialValue: EditDeletePhaseFlyoutValue = useMemo(() => {
    if (!failureStoreEnabled || retentionDisabled) {
      return { deletePhaseEnabled: false };
    }
    const retention = customRetentionPeriod ?? defaultRetentionPeriod;
    if (!retention) {
      return { deletePhaseEnabled: false };
    }
    return {
      deletePhaseEnabled: true,
      dataRetention: retention,
      isDefaultRetention: customRetentionPeriod == null,
    };
  }, [customRetentionPeriod, defaultRetentionPeriod, failureStoreEnabled, retentionDisabled]);

  const failedDeletePhaseInitialRetention = useMemo(() => {
    return failedDeletePhaseInitialValue.deletePhaseEnabled
      ? failedDeletePhaseInitialValue.dataRetention
      : undefined;
  }, [failedDeletePhaseInitialValue]);

  const closeDeletePhaseFlyout = useCallback(() => {
    setIsDeletePhaseFlyoutOpen(false);
  }, []);

  useEffect(() => {
    if (!isDeletePhaseFlyoutOpen) {
      if (!(isMainFlyoutOpen && inheritLifecycle)) {
        clearLifecyclePreview();
      }
      return;
    }

    const nextRetention = failedDeletePhaseInitialValue.deletePhaseEnabled
      ? failedDeletePhaseInitialRetention
      : effectiveDefaultRetentionPeriod;
    syncDeletePhasePreview(nextRetention ?? null);
  }, [
    clearLifecyclePreview,
    effectiveDefaultRetentionPeriod,
    failedDeletePhaseInitialRetention,
    failedDeletePhaseInitialValue.deletePhaseEnabled,
    inheritLifecycle,
    isDeletePhaseFlyoutOpen,
    isMainFlyoutOpen,
    syncDeletePhasePreview,
  ]);

  const performSaveDeletePhase = async (next: EditDeletePhaseFlyoutValue) => {
    try {
      setIsSaving(true);
      const nextFailureStore = next.deletePhaseEnabled
        ? next.isDefaultRetention
          ? { lifecycle: { enabled: {} } }
          : { lifecycle: { enabled: { data_retention: next.dataRetention } } }
        : { lifecycle: { disabled: {} } };

      if (inheritOptions.isCurrentlyInherited) {
        setInheritLifecycle(false);
      }

      await updateFailureStore(definition.stream.name, nextFailureStore);
      refreshDefinition();
      showSaveSuccess();
    } catch (error) {
      notifications.toasts.addError(getFormattedError(error), {
        title: i18n.translate('xpack.streams.streamDetailFailureStore.updateFailureStoreFailed', {
          defaultMessage: "We couldn't update the failure store settings.",
        }),
      });
    } finally {
      setIsSaving(false);
      closeDeletePhaseFlyout();
      data.refresh();
    }
  };

  const saveDeletePhase = (next: EditDeletePhaseFlyoutValue) => {
    confirmOverride(() => performSaveDeletePhase(next));
  };

  const performRemoveDeletePhase = async () => {
    try {
      setIsSaving(true);
      if (inheritOptions.isCurrentlyInherited) {
        setInheritLifecycle(false);
      }
      await updateFailureStore(definition.stream.name, { lifecycle: { disabled: {} } });
      refreshDefinition();
      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.streams.failureStore.removeDeletePhaseSuccess', {
          defaultMessage: 'Delete phase removed',
        }),
      });
    } catch (error) {
      notifications.toasts.addError(getFormattedError(error), {
        title: i18n.translate('xpack.streams.failureStore.removeDeletePhaseError', {
          defaultMessage: 'Failed to remove delete phase',
        }),
      });
    } finally {
      setIsSaving(false);
      data.refresh();
    }
  };

  const removeDeletePhase = () => {
    confirmOverride(() => performRemoveDeletePhase());
  };

  const openDeletePhaseFlyout = useCallback(() => {
    // Only one lifecycle flyout may be open at a time in this tab. The trigger
    // buttons are already disabled while another flyout is open, but guard here
    // too so a stale/duplicate call can't open a second flyout on top.
    if (isMainFlyoutOpen || isExternalFlyoutOpen) {
      return;
    }
    setInheritLifecycle(inheritOptions.isCurrentlyInherited);
    setIsDeletePhaseFlyoutOpen(true);
  }, [inheritOptions.isCurrentlyInherited, isExternalFlyoutOpen, isMainFlyoutOpen]);

  const onChangeDeletePhase = (next: EditDeletePhaseFlyoutValue) => {
    const nextRetention = next.deletePhaseEnabled ? next.dataRetention : null;
    syncDeletePhasePreview(nextRetention);
  };

  useEffect(() => {
    onFlyoutOpenChange?.(isAnyFlyoutOpenInternal);
  }, [isAnyFlyoutOpenInternal, onFlyoutOpenChange]);

  useEffect(() => {
    if (isAnyFlyoutOpenInternal) {
      return;
    }
    clearLifecyclePreview();
  }, [clearLifecyclePreview, isAnyFlyoutOpenInternal]);

  const mainFlyout =
    isMainFlyoutOpen && manageFailureStorePrivilege ? (
      <LifecycleFlyout
        onClose={closeMainFlyout}
        ownFocus={false}
        paddingSize="none"
        data-test-subj="streamsEditFailedDataLifecycleFlyout"
        titleId={titleId}
        title={i18n.translate('xpack.streams.editFailedLifecycle.title', {
          defaultMessage: 'Edit failed data lifecycle',
        })}
      >
        <EditFailedDataLifecycleFlyoutBody
          inherit={
            inheritOptions.canShowInherit
              ? {
                  value: inheritLifecycle,
                  onChange: onChangeInheritLifecycle,
                  label: failedInheritLabel,
                  link: failedInheritLink,
                }
              : undefined
          }
          failureStore={{
            value: failureStoreEnabledDraft,
            onChange: setFailureStoreEnabledDraft,
          }}
        />

        <FlyoutFooterWithRetentionWarning
          onCancel={closeMainFlyout}
          onApply={saveMainFlyout}
          isApplyDisabled={
            isSaving ||
            (inheritLifecycle === inheritOptions.isCurrentlyInherited &&
              failureStoreEnabledDraft === failureStoreEnabled)
          }
          showWarning={false}
        />
      </LifecycleFlyout>
    ) : null;

  const deletePhaseFlyout =
    isDeletePhaseFlyoutOpen && manageFailureStorePrivilege ? (
      <EditDeletePhaseFlyout
        initialValue={failedDeletePhaseInitialValue}
        defaultRetentionPeriod={effectiveDefaultRetentionPeriod}
        showRestoreDefaultButton
        allowRemoveDeletePhase={!isServerless}
        onChange={onChangeDeletePhase}
        onSave={saveDeletePhase}
        onClose={closeDeletePhaseFlyout}
        isSaving={isSaving}
        data-test-subj="streamsEditFailedDeletePhaseFlyout"
      />
    ) : null;

  return {
    mainFlyout,
    deletePhaseFlyout,
    overrideModal,
    openMainFlyout,
    openDeletePhaseFlyout,
    removeDeletePhase,
    isMainFlyoutOpen,
    isAnyFlyoutOpen,
    failureStoreEnabledForUi,
    previewInheritLifecycle: isAnyFlyoutOpen ? inheritLifecycle : undefined,
    previewFailureStoreEnabled: isAnyFlyoutOpen ? failureStoreEnabledForUi : undefined,
  };
};
