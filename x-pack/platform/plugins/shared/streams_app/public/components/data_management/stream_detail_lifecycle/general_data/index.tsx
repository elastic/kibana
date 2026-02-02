/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { PolicyFromES } from '@kbn/index-lifecycle-management-common-shared';
import { useAbortController } from '@kbn/react-hooks';
import { type IngestStreamLifecycle, type Streams } from '@kbn/streams-schema';
import React, { useState } from 'react';
import { omit } from 'lodash';
import { useKibana } from '../../../../hooks/use_kibana';
import { useTimefilter } from '../../../../hooks/use_timefilter';
import { getFormattedError } from '../../../../util/errors';
import { getStreamTypeFromDefinition } from '../../../../util/get_stream_type_from_definition';
import type { useDataStreamStats } from '../hooks/use_data_stream_stats';
import { SectionPanel } from '../common/section_panel';
import { EditLifecycleModal } from './modal';
import { RetentionCard } from './cards/retention_card';
import { StorageSizeCard } from './cards/storage_size_card';
import { IngestionCard } from './cards/ingestion_card';
import { LifecycleSummary } from './lifecycle_summary';
import { IngestionRate } from './ingestion_rate';

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

      const body = {
        ingest: {
          ...definition.stream.ingest,
          processing: omit(definition.stream.ingest.processing, 'updated_at'),
          lifecycle,
        },
      };

      await streamsRepositoryClient.fetch('PUT /api/streams/{name}/_ingest 2023-10-31', {
        params: {
          path: { name: definition.stream.name },
          body,
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
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="checkInCircleFilled" color="success" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <h4>
              {i18n.translate('xpack.streams.streamDetailLifecycle.successfulIngestData', {
                defaultMessage: 'Successful ingest data',
              })}
            </h4>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiTitle>

      {/* Retention Section */}
      <SectionPanel
        topCard={
          <RetentionCard definition={definition} openEditModal={() => setIsEditModalOpen(true)} />
        }
        bottomCard={
          <StorageSizeCard
            hasMonitorPrivileges={definition.privileges?.monitor}
            stats={data.stats?.ds.stats}
            statsError={data.error}
          />
        }
      >
        {definition.privileges.lifecycle ? (
          <LifecycleSummary definition={definition} stats={data.stats?.ds.stats} />
        ) : null}
      </SectionPanel>

      {/* Ingestion Section */}
      <SectionPanel
        topCard={
          <IngestionCard
            period="daily"
            hasMonitorPrivileges={definition.privileges?.monitor}
            stats={data.stats?.ds.stats}
            statsError={data.error}
          />
        }
        bottomCard={
          <IngestionCard
            period="monthly"
            hasMonitorPrivileges={definition.privileges?.monitor}
            stats={data.stats?.ds.stats}
            statsError={data.error}
          />
        }
      >
        <IngestionRate
          definition={definition}
          isLoadingStats={data.isLoading}
          stats={data.stats?.ds.stats}
          timeState={timeState}
          statsError={data.error}
          aggregations={data.stats?.ds.aggregations}
        />
      </SectionPanel>
    </EuiFlexGroup>
  );
};
