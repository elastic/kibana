/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import type { Streams } from '@kbn/streams-schema';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiIconTip, EuiTitle, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { withSuspense } from '@kbn/shared-ux-utility';
import type { FailureStoreFormData } from '@kbn/failure-store-modal';
import { NoFailureStorePanel } from './no_failure_store_panel';
import { FailureStoreInfo } from './failure_store_info';
import { useUpdateFailureStore } from '../../../../hooks/use_update_failure_store';
import { useKibana } from '../../../../hooks/use_kibana';
import { NoPermissionBanner } from './no_permission_banner';
import { useTimefilter } from '../../../../hooks/use_timefilter';
import type { useDataStreamStats } from '../hooks/use_data_stream_stats';
import { getFormattedError } from '../../../../util/errors';
import {
  transformFailureStoreConfig,
  useFailureStoreConfig,
} from '../hooks/use_failure_store_config';

// Lazy load the FailureStoreModal to reduce bundle size
const LazyFailureStoreModal = React.lazy(async () => ({
  default: (await import('@kbn/failure-store-modal')).FailureStoreModal,
}));

const FailureStoreModal = withSuspense(LazyFailureStoreModal);

export const StreamDetailFailureStore = ({
  definition,
  data,
  refreshDefinition,
}: {
  definition: Streams.ingest.all.GetResponse;
  data: ReturnType<typeof useDataStreamStats>;
  refreshDefinition: () => void;
}) => {
  const [isFailureStoreModalOpen, setIsFailureStoreModalOpen] = useState(false);
  const { updateFailureStore } = useUpdateFailureStore(definition.stream);
  const {
    core: { notifications },
  } = useKibana();

  const { timeState } = useTimefilter();
  const { isServerless } = useKibana();

  const {
    privileges: {
      read_failure_store: readFailureStorePrivilege,
      manage_failure_store: manageFailureStorePrivilege,
    },
  } = definition;

  const failureStoreConfig = useFailureStoreConfig(definition);
  const {
    failureStoreEnabled,
    defaultRetentionPeriod,
    customRetentionPeriod,
    inheritOptions,
    retentionDisabled,
  } = failureStoreConfig;

  const closeModal = () => {
    setIsFailureStoreModalOpen(false);
  };

  const handleSaveModal = async (update: FailureStoreFormData) => {
    try {
      await updateFailureStore(definition.stream.name, transformFailureStoreConfig(update));

      refreshDefinition();

      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.streams.streamDetailFailureStore.updateFailureStoreSuccess', {
          defaultMessage: 'Failure store settings saved',
        }),
      });
    } catch (error) {
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.streams.streamDetailFailureStore.updateFailureStoreFailed', {
          defaultMessage: "We couldn't update the failure store settings.",
        }),
        toastMessage: getFormattedError(error).message,
      });
    } finally {
      closeModal();
      data.refresh();
    }
  };

  return (
    <EuiFlexItem grow={false}>
      <EuiTitle size="xs">
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="errorFilled" color="danger" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <h4>
              {i18n.translate('xpack.streams.streamDetailLifecycle.failedIngestData', {
                defaultMessage: 'Failed ingest data ',
              })}
            </h4>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIconTip
              content={i18n.translate(
                'xpack.streams.streamDetailView.failureStoreEnabled.tooltip',
                {
                  defaultMessage:
                    'Failed ingest data is stored in a failure store. A failure store is a secondary set of indices inside a data stream, dedicated to storing failed documents.',
                }
              )}
              size="s"
              position="right"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="column" gutterSize="m">
        {readFailureStorePrivilege ? (
          <>
            {isFailureStoreModalOpen && manageFailureStorePrivilege && (
              <FailureStoreModal
                onCloseModal={closeModal}
                onSaveModal={handleSaveModal}
                failureStoreProps={{
                  failureStoreEnabled,
                  defaultRetentionPeriod,
                  customRetentionPeriod,
                  retentionDisabled,
                }}
                inheritOptions={inheritOptions}
                showIlmDescription={!isServerless}
                canShowDisableLifecycle={!isServerless}
                disableButtonLabel={i18n.translate(
                  'xpack.streams.dataManagement.streamDetailLifecycle.indefinite',
                  {
                    defaultMessage: 'Indefinite',
                  }
                )}
              />
            )}
            {data.isLoading || failureStoreEnabled ? (
              <FailureStoreInfo
                openModal={setIsFailureStoreModalOpen}
                definition={definition}
                statsError={data.error}
                isLoadingStats={data.isLoading}
                stats={data.stats?.fs.stats}
                timeState={timeState}
                aggregations={data?.stats?.fs.aggregations}
                failureStoreConfig={failureStoreConfig}
              />
            ) : (
              <NoFailureStorePanel openModal={setIsFailureStoreModalOpen} definition={definition} />
            )}
            <EuiSpacer size="s" />
          </>
        ) : (
          <NoPermissionBanner />
        )}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
