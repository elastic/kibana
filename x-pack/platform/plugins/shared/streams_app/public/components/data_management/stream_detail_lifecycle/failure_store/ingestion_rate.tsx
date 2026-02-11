/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { Streams } from '@kbn/streams-schema';
import type { TimeState } from '@kbn/es-query';
import { FailureStoreChartBarSeries } from '../common/chart_components';
import { IngestionRatePanel } from '../common/ingestion_rate_panel';
import type { StreamAggregations } from '../hooks/use_ingestion_rate';
import type { EnhancedFailureStoreStats } from '../hooks/use_data_stream_stats';

export function FailureStoreIngestionRate({
  definition,
  stats,
  isLoadingStats,
  timeState,
  aggregations,
  statsError,
}: {
  definition: Streams.ingest.all.GetResponse;
  stats?: EnhancedFailureStoreStats;
  isLoadingStats: boolean;
  timeState: TimeState;
  aggregations?: StreamAggregations;
  statsError: Error | undefined;
}) {
  return (
    <IngestionRatePanel isLoading={isLoadingStats} hasAggregations={Boolean(aggregations)}>
      <FailureStoreChartBarSeries
        definition={definition}
        stats={stats}
        timeState={timeState}
        isLoadingStats={isLoadingStats}
        statsError={statsError}
        aggregations={aggregations}
      />
    </IngestionRatePanel>
  );
}
