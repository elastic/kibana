/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import type { EffectiveFailureStore, Streams } from '@kbn/streams-schema';
import { isEnabledFailureStore, isEnabledLifecycleFailureStore } from '@kbn/streams-schema';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEqual } from 'lodash';
import { NoFailureStorePanel } from './no_failure_store_panel';
import { FailureStoreInfo } from './failure_store_info';
import { useUpdateFailureStore } from '../../../../../hooks/use_update_failure_store';
import { useKibana } from '../../../../../hooks/use_kibana';
import { NoPermissionBanner } from './no_permission_banner';
import { useTimefilter } from '../../../../../hooks/use_timefilter';
import type { useDataStreamStats } from '../hooks/use_data_stream_stats';
import { useFailureStoreConfig } from '../hooks/use_failure_store_config';
import { LifecyclePreviewProvider } from '../common/hooks/lifecycle_preview';
import {
  type EditFlyoutPreviewModel,
  useEditFlyoutPreviewSyncFromModel,
} from '../common/hooks/use_edit_flyout_preview_sync';
import { getImportedFailureStore } from '../import_from_stream/get_imported_failure_store';
import { useEditFailedLifecycleFlyout } from './hooks/use_edit_failed_lifecycle_flyout';

const StreamDetailFailureStoreInner = ({
  definition,
  data,
  refreshDefinition,
  isImportFlyoutOpen = false,
  importPreviewFailureStore = null,
}: {
  definition: Streams.ingest.all.GetResponse;
  data: ReturnType<typeof useDataStreamStats>;
  refreshDefinition: () => void;
  isImportFlyoutOpen?: boolean;
  importPreviewFailureStore?: EffectiveFailureStore | null;
}) => {
  const kibana = useKibana();
  const { updateFailureStore } = useUpdateFailureStore(definition.stream);
  const { timeState } = useTimefilter();

  const readFailureStorePrivilege = definition.privileges?.read_failure_store ?? false;
  const manageFailureStorePrivilege = definition.privileges?.manage_failure_store ?? false;

  const failureStoreConfig = useFailureStoreConfig(definition);

  const {
    mainFlyout,
    deletePhaseFlyout,
    overrideModal,
    openMainFlyout,
    openDeletePhaseFlyout,
    removeDeletePhase,
    isMainFlyoutOpen,
    isDeletePhaseFlyoutOpen,
    isAnyFlyoutOpen,
    failureStoreEnabledForUi,
    previewInheritLifecycle,
    previewFailureStoreEnabled,
  } = useEditFailedLifecycleFlyout({
    definition,
    data,
    refreshDefinition,
    failureStoreConfig,
    kibana,
    manageFailureStorePrivilege,
    updateFailureStore,
  });

  const importPreviewModel = useMemo<EditFlyoutPreviewModel>(() => {
    if (!isImportFlyoutOpen) {
      return null;
    }
    if (!importPreviewFailureStore) {
      return { action: 'clear', hasUnsavedChanges: false };
    }

    const nextFailureStore = getImportedFailureStore(importPreviewFailureStore);
    const importHasUnsavedChanges = !isEqual(
      definition.stream.ingest.failure_store,
      nextFailureStore
    );

    if (!isEnabledFailureStore(importPreviewFailureStore)) {
      return { action: 'clear', hasUnsavedChanges: importHasUnsavedChanges };
    }

    const retentionPeriod = isEnabledLifecycleFailureStore(importPreviewFailureStore)
      ? importPreviewFailureStore.lifecycle.enabled.data_retention ?? null
      : null;

    return {
      action: 'apply',
      retentionPeriod,
      dataPhasesCount: retentionPeriod ? 2 : 1,
      hasUnsavedChanges: importHasUnsavedChanges,
    };
  }, [definition.stream.ingest.failure_store, importPreviewFailureStore, isImportFlyoutOpen]);

  const importPreviewFailureStoreEnabled =
    isImportFlyoutOpen && importPreviewFailureStore
      ? isEnabledFailureStore(importPreviewFailureStore)
      : undefined;

  const effectiveFailureStoreEnabledForUi =
    importPreviewFailureStoreEnabled ?? failureStoreEnabledForUi;

  const effectivePreviewFailureStoreEnabled = isImportFlyoutOpen
    ? importPreviewFailureStoreEnabled
    : previewFailureStoreEnabled;

  const effectivePreviewInheritLifecycle =
    isImportFlyoutOpen && importPreviewFailureStore ? false : previewInheritLifecycle;

  useEditFlyoutPreviewSyncFromModel({
    isFlyoutOpen: isImportFlyoutOpen,
    isExternalFlyoutOpen: isMainFlyoutOpen || isDeletePhaseFlyoutOpen,
    preview: importPreviewModel,
  });

  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <h4>
                {i18n.translate('xpack.streams.streamDetailLifecycle.failedData', {
                  defaultMessage: 'Failed data',
                })}
              </h4>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiFlexGroup direction="column" gutterSize="m">
          {readFailureStorePrivilege ? (
            <>
              {effectiveFailureStoreEnabledForUi ? (
                <FailureStoreInfo
                  onEditFailedLifecycle={openMainFlyout}
                  onAddDeletePhase={openDeletePhaseFlyout}
                  onEditDeletePhase={openDeletePhaseFlyout}
                  onRemoveDeletePhase={removeDeletePhase}
                  isExternalFlyoutOpen={isAnyFlyoutOpen}
                  isDeletePhaseFlyoutOpen={isDeletePhaseFlyoutOpen}
                  isHighlighted={isMainFlyoutOpen || isImportFlyoutOpen}
                  previewInheritLifecycle={effectivePreviewInheritLifecycle}
                  previewFailureStoreEnabled={effectivePreviewFailureStoreEnabled}
                  definition={definition}
                  statsError={data.error}
                  isLoadingStats={data.isLoading}
                  stats={data.stats?.fs.stats}
                  timeState={timeState}
                  aggregations={data?.stats?.fs.aggregations}
                  failureStoreConfig={failureStoreConfig}
                />
              ) : (
                <NoFailureStorePanel
                  onEnableFailureStore={openMainFlyout}
                  definition={definition}
                  isExternalFlyoutOpen={isAnyFlyoutOpen}
                />
              )}
              <EuiSpacer size="s" />
            </>
          ) : (
            <NoPermissionBanner />
          )}
        </EuiFlexGroup>
      </EuiFlexItem>

      {readFailureStorePrivilege ? mainFlyout : null}
      {readFailureStorePrivilege ? deletePhaseFlyout : null}
      {readFailureStorePrivilege ? overrideModal : null}
    </>
  );
};

export const StreamDetailFailureStore = (props: {
  definition: Streams.ingest.all.GetResponse;
  data: ReturnType<typeof useDataStreamStats>;
  refreshDefinition: () => void;
  isImportFlyoutOpen?: boolean;
  importPreviewFailureStore?: EffectiveFailureStore | null;
}) => {
  return (
    <LifecyclePreviewProvider>
      <StreamDetailFailureStoreInner {...props} />
    </LifecyclePreviewProvider>
  );
};
