/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { Streams } from '@kbn/streams-schema';
import type { TimeState } from '@kbn/es-query';
import { SectionPanel } from '../common/section_panel';
import { RetentionCard } from './cards/retention_card';
import { StorageSizeCard } from './cards/storage_size_card';
import { IngestionCard } from './cards/ingestion_card';
import { FailureStoreSummary } from './failure_store_summary';
import { FailureStoreIngestionRate } from './ingestion_rate';
import type { StreamAggregations } from '../hooks/use_ingestion_rate';
import type { EnhancedFailureStoreStats } from '../hooks/use_data_stream_stats';
import type { useFailureStoreConfig } from '../hooks/use_failure_store_config';

export const FailureStoreInfo = ({
  openModal,
  definition,
  statsError,
  isLoadingStats,
  stats,
  timeState,
  aggregations,
  failureStoreConfig,
}: {
  openModal: (show: boolean) => void;
  definition: Streams.ingest.all.GetResponse;
  statsError: Error | undefined;
  isLoadingStats: boolean;
  stats?: EnhancedFailureStoreStats;
  timeState: TimeState;
  aggregations?: StreamAggregations;
  failureStoreConfig: ReturnType<typeof useFailureStoreConfig>;
}) => {
  const hasPrivileges = definition.privileges?.manage_failure_store ?? false;

  return (
    <>
      {/* Retention Section */}
      <SectionPanel
        topCard={
          <RetentionCard
            openModal={openModal}
            canManageFailureStore={hasPrivileges}
            streamName={definition.stream.name}
            failureStoreConfig={failureStoreConfig}
          />
        }
        bottomCard={
          <StorageSizeCard stats={stats} hasPrivileges={hasPrivileges} statsError={statsError} />
        }
      >
        {definition.privileges.lifecycle ? (
          <FailureStoreSummary stats={stats} failureStoreConfig={failureStoreConfig} />
        ) : null}
      </SectionPanel>
      {/* Ingestion Section */}
      <SectionPanel
        topCard={
          <IngestionCard
            period="daily"
            hasPrivileges={hasPrivileges}
            stats={stats}
            statsError={statsError}
          />
        }
        bottomCard={
          <IngestionCard
            period="monthly"
            hasPrivileges={hasPrivileges}
            stats={stats}
            statsError={statsError}
          />
        }
      >
        <FailureStoreIngestionRate
          definition={definition}
          isLoadingStats={isLoadingStats}
          stats={stats}
          timeState={timeState}
          statsError={statsError}
          aggregations={aggregations}
        />
      </SectionPanel>
    </>
  );
};
