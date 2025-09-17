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
import { useStreamDetail } from '../../../../hooks/use_stream_detail';
import { useKibana } from '../../../../hooks/use_kibana';
import { NoPermissionBanner } from './no_permission_banner';

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
  const { refresh } = useStreamDetail();
  const { updateFailureStore } = useUpdateFailureStore(definition.stream);
  const {
    core: { notifications },
  } = useKibana();

  const {
    effective_failure_store: failureStore,
    privileges: {
      read_failure_store: readFailureStorePrivilege,
      manage_failure_store: manageFailureStorePrivilege,
    },
  } = definition;

  const closeModal = () => {
    setIsFailureStoreModalOpen(false);
  };

  const handleSaveModal = async (data: {
    failureStoreEnabled: boolean;
    customRetentionPeriod?: string;
  }) => {
    try {
      await updateFailureStore(definition.stream.name, {
        failureStoreEnabled: data.failureStoreEnabled,
        customRetentionPeriod: data.customRetentionPeriod,
      });

      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.streams.streamDetailFailureStore.updateFailureStoreSuccess', {
          defaultMessage: 'Failure store settings saved',
        }),
      });

      refresh();
    } catch (error) {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.streams.streamDetailFailureStore.updateFailureStoreFailed', {
          defaultMessage: "We couldn't update the failure store settings.",
        }),
        text: error.message,
      });
    }
    closeModal();
  };

  return (
    <>
      {readFailureStorePrivilege && failureStore ? (
        <>
          {isFailureStoreModalOpen && manageFailureStorePrivilege && (
            <FailureStoreModal
              onCloseModal={closeModal}
              onSaveModal={handleSaveModal}
              failureStoreProps={{
                failureStoreEnabled: failureStore.enabled,
                defaultRetentionPeriod: failureStore.retentionPeriod.default,
                customRetentionPeriod: failureStore.retentionPeriod.custom,
              }}
            />
          )}
          {failureStore.enabled ? (
            <FailureStoreInfo openModal={setIsFailureStoreModalOpen} definition={definition} />
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
