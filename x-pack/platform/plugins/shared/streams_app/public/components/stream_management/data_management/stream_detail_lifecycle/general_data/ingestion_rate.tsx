/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { isIlmLifecycle } from '@kbn/streams-schema';
import React from 'react';
import type { TimeState } from '@kbn/es-query';
import { useKibana } from '../../../../../hooks/use_kibana';
import { ChartBarSeries, ChartBarPhasesSeries } from '../common/chart_components';
import { IngestionRatePanel } from '../common/ingestion_rate_panel';
import type { StreamAggregations } from '../hooks/use_ingestion_rate';
import type { CalculatedStats } from '../helpers/get_calculated_stats';

export function IngestionRate({
  definition,
  stats,
  isLoadingStats,
  timeState,
  aggregations,
  statsError,
}: {
  definition: Streams.ingest.all.GetResponse;
  stats?: CalculatedStats;
  isLoadingStats: boolean;
  timeState: TimeState;
  aggregations?: StreamAggregations;
  statsError: Error | undefined;
}) {
  return (
    <IngestionRateContent
      indexName={definition.stream.name}
      isIlm={isIlmLifecycle(definition.effective_lifecycle)}
      stats={stats}
      isLoadingStats={isLoadingStats}
      timeState={timeState}
      aggregations={aggregations}
      statsError={statsError}
    />
  );
}

export function IngestionRateContent({
  indexName,
  isIlm,
  stats,
  isLoadingStats,
  timeState,
  aggregations,
  statsError,
}: {
  indexName: string;
  isIlm: boolean;
  stats?: CalculatedStats;
  isLoadingStats: boolean;
  timeState: TimeState;
  aggregations?: StreamAggregations;
  statsError: Error | undefined;
}) {
  const { isServerless } = useKibana();

  return (
    <IngestionRatePanel isLoading={isLoadingStats} hasAggregations={Boolean(aggregations)}>
      {isServerless ? (
        <ChartBarSeries
          stats={stats}
          timeState={timeState}
          isLoadingStats={isLoadingStats}
          statsError={statsError}
          aggregations={aggregations}
        />
      ) : (
        <ChartBarPhasesSeries
          indexName={indexName}
          isIlm={isIlm}
          stats={stats}
          timeState={timeState}
          isLoadingStats={isLoadingStats}
          statsError={statsError}
        />
      )}
    </IngestionRatePanel>
  );
}
