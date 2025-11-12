/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import type { TimeState } from '@kbn/es-query';
import type { EffectiveFailureStore } from '@kbn/streams-schema/src/models/ingest/failure_store';
import { RetentionCard } from './cards/retention_card';
import { StorageSizeCard } from './cards/storage_size_card';
import { IngestionCard } from './cards/ingestion_card';
import { FailureStoreIngestionRate } from './ingestion_rate';
import type { StreamAggregations } from '../hooks/use_ingestion_rate';
import type { EnhancedFailureStoreStats } from '../hooks/use_data_stream_stats';

export const FailureStoreInfo = ({
  openModal,
  definition,
  statsError,
  isLoadingStats,
  stats,
  config,
  timeState,
  aggregations,
}: {
  openModal: (show: boolean) => void;
  definition: Streams.ingest.all.GetResponse;
  statsError: Error | undefined;
  isLoadingStats: boolean;
  stats?: EnhancedFailureStoreStats;
  config?: EffectiveFailureStore;
  timeState: TimeState;
  aggregations?: StreamAggregations;
}) => {
  return (
    <>
      <EuiTitle size="xs">
        <h4>
          {i18n.translate('xpack.streams.streamDetailView.failureStoreEnabled.title', {
            defaultMessage: 'Failure store ',
          })}
          <EuiIconTip
            content={i18n.translate('xpack.streams.streamDetailView.failureStoreEnabled.tooltip', {
              defaultMessage:
                'A failure store is a secondary set of indices inside a data stream, dedicated to storing failed documents.',
            })}
            position="right"
          />
        </h4>
      </EuiTitle>
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem>
          <RetentionCard
            openModal={openModal}
            canManageFailureStore={definition.privileges?.manage_failure_store}
            streamName={definition.stream.name}
            failureStore={config}
            definition={definition}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <StorageSizeCard
            stats={stats}
            hasPrivileges={definition.privileges?.manage_failure_store}
            statsError={statsError}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <IngestionCard
            stats={stats}
            hasPrivileges={definition.privileges?.manage_failure_store}
            statsError={statsError}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <FailureStoreIngestionRate
        definition={definition}
        isLoadingStats={isLoadingStats}
        stats={stats}
        timeState={timeState}
        statsError={statsError}
        aggregations={aggregations}
      />
    </>
  );
};
