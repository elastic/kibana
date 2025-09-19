/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import type { Streams } from '@kbn/streams-schema';
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { withSuspense } from '@kbn/shared-ux-utility';
import { NoFailureStorePanel } from './no_failure_store_panel';
import { FailureStoreInfo } from './failure_store_info';
import { useUpdateFailureStore } from '../../../../hooks/use_update_failure_store';
import { useKibana } from '../../../../hooks/use_kibana';
import { NoPermissionBanner } from './no_permission_banner';
import { useFailureStoreStats } from '../hooks/use_failure_store_stats';

// Lazy load the FailureStoreModal to reduce bundle size
const LazyFailureStoreModal = React.lazy(async () => ({
  default: (await import('@kbn/failure-store-modal')).FailureStoreModal,
}));

const FailureStoreModal = withSuspense(LazyFailureStoreModal);

export const StreamDetailFailureStore = ({
  definition,
}: {
  definition: Streams.ingest.all.GetResponse;
}) => {
  const [isFailureStoreModalOpen, setIsFailureStoreModalOpen] = useState(false);
  const { updateFailureStore } = useUpdateFailureStore();
  const {
    core: { notifications },
  } = useKibana();

  const {
    privileges: {
      read_failure_store: readFailureStorePrivilege,
      manage_failure_store: manageFailureStorePrivilege,
    },
  } = definition;

  const closeModal = () => {
    setIsFailureStoreModalOpen(false);
  };

  const {
    data,
    isLoading: isLoadingStats,
    error: statsError,
    refresh,
  } = useFailureStoreStats({ definition });

  const handleSaveModal = async (update: {
    failureStoreEnabled: boolean;
    customRetentionPeriod?: string;
  }) => {
    try {
      await updateFailureStore(definition.stream.name, {
        failureStoreEnabled: update.failureStoreEnabled,
        customRetentionPeriod: update.customRetentionPeriod,
      });

      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.streams.streamDetailFailureStore.updateFailureStoreSuccess', {
          defaultMessage: 'Failure store settings saved',
        }),
      });
    } catch (error) {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.streams.streamDetailFailureStore.updateFailureStoreFailed', {
          defaultMessage: "We couldn't update the failure store settings.",
        }),
        text: error.message,
      });
    }
    closeModal();
    refresh();
  };

  return (
    <>
      {readFailureStorePrivilege ? (
        <>
          {isFailureStoreModalOpen && manageFailureStorePrivilege && data?.config && (
            <FailureStoreModal
              onCloseModal={closeModal}
              onSaveModal={handleSaveModal}
              failureStoreProps={{
                failureStoreEnabled: data?.config.enabled,
                defaultRetentionPeriod: data?.config.retentionPeriod.default,
                customRetentionPeriod: data?.config.retentionPeriod.custom,
              }}
            />
          )}
          {isLoadingStats || data?.config.enabled ? (
            <FailureStoreInfo
              openModal={setIsFailureStoreModalOpen}
              definition={definition}
              statsError={statsError}
              isLoadingStats={isLoadingStats}
              stats={data?.stats}
              config={data?.config}
            />
          ) : (
            <NoFailureStorePanel openModal={setIsFailureStoreModalOpen} />
          )}
          <EuiSpacer size="s" />
        </>
      ) : (
        <NoPermissionBanner />
      )}
    </>
  );
};
