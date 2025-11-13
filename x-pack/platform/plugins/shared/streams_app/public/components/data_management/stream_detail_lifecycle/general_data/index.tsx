/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';
import React, { useState } from 'react';
import type { IngestStreamLifecycle } from '@kbn/streams-schema';
import type { Streams } from '@kbn/streams-schema';
import { isIlmLifecycle } from '@kbn/streams-schema';
import type { PolicyFromES } from '@kbn/index-lifecycle-management-common-shared';
import { i18n } from '@kbn/i18n';
import { useAbortController } from '@kbn/react-hooks';
import { useTimefilter } from '../../../../hooks/use_timefilter';
import { getStreamTypeFromDefinition } from '../../../../util/get_stream_type_from_definition';
import { useKibana } from '../../../../hooks/use_kibana';
import { EditLifecycleModal } from './modal';
import { IlmSummary } from './ilm_summary';
import { IngestionRate } from './ingestion_rate';
import type { useDataStreamStats } from '../hooks/use_data_stream_stats';
import { getFormattedError } from '../../../../util/errors';
import { RetentionCard } from './cards/retention_card';
import { StorageSizeCard } from './cards/storage_size_card';
import { IngestionCard } from './cards/ingestion_card';

export const StreamDetailGeneralData = ({
  definition,
  refreshDefinition,
  data,
}: {
  definition: Streams.ingest.all.GetResponse;
  refreshDefinition: () => void;
  data: ReturnType<typeof useDataStreamStats>;
}) => {
  const {
    core: { http, notifications },
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
    services: { telemetryClient },
  } = useKibana();

  const { timeState } = useTimefilter();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [updateInProgress, setUpdateInProgress] = useState(false);

  const { signal } = useAbortController();

  const getIlmPolicies = () =>
    http.get<PolicyFromES[]>('/api/index_lifecycle_management/policies', {
      signal,
    });

  const updateLifecycle = async (lifecycle: IngestStreamLifecycle) => {
    try {
      setUpdateInProgress(true);

      const request = {
        ingest: {
          ...definition.stream.ingest,
          lifecycle,
        },
      };

      await streamsRepositoryClient.fetch('PUT /api/streams/{name}/_ingest 2023-10-31', {
        params: {
          path: { name: definition.stream.name },
          body: request,
        },
        signal,
      });

      refreshDefinition();
      setIsEditModalOpen(false);

      telemetryClient.trackRetentionChanged(
        lifecycle,
        getStreamTypeFromDefinition(definition.stream)
      );
      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.streams.streamDetailLifecycle.updated', {
          defaultMessage: 'Stream lifecycle updated',
        }),
      });
    } catch (error) {
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.streams.streamDetailLifecycle.failed', {
          defaultMessage: 'Failed to update lifecycle',
        }),
        toastMessage: getFormattedError(error).message,
      });
    } finally {
      setUpdateInProgress(false);
    }
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="m" css={{ flexGrow: 0 }}>
      {isEditModalOpen && (
        <EditLifecycleModal
          definition={definition}
          closeModal={() => setIsEditModalOpen(false)}
          updateLifecycle={updateLifecycle}
          getIlmPolicies={getIlmPolicies}
          updateInProgress={updateInProgress}
        />
      )}
      <EuiTitle size="xs">
        <h4>
          {i18n.translate('xpack.streams.streamDetailLifecycle.generalData', {
            defaultMessage: 'General data',
          })}
        </h4>
      </EuiTitle>
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem>
          <RetentionCard definition={definition} openEditModal={() => setIsEditModalOpen(true)} />
        </EuiFlexItem>
        <EuiFlexItem>
          <StorageSizeCard
            hasMonitorPrivileges={definition.privileges?.monitor}
            stats={data.stats?.ds.stats}
            statsError={data.error}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <IngestionCard
            hasMonitorPrivileges={definition.privileges?.monitor}
            stats={data.stats?.ds.stats}
            statsError={data.error}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {definition.privileges.lifecycle && isIlmLifecycle(definition.effective_lifecycle) ? (
        <EuiPanel hasShadow={false} hasBorder paddingSize="m" grow={false}>
          <IlmSummary definition={definition} stats={data.stats?.ds.stats} />
        </EuiPanel>
      ) : null}
      <EuiPanel hasShadow={false} hasBorder paddingSize="m" grow={false}>
        <IngestionRate
          definition={definition}
          isLoadingStats={data.isLoading}
          stats={data.stats?.ds.stats}
          timeState={timeState}
          statsError={data.error}
          aggregations={data.stats?.ds.aggregations}
        />
      </EuiPanel>
    </EuiFlexGroup>
  );
};
