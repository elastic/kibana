import type { Streams } from '@kbn/streams-schema';
import React from 'react';
import type { TimeState } from '@kbn/es-query';
import type { StreamAggregations } from '../hooks/use_ingestion_rate';
import type { CalculatedStats } from '../helpers/get_calculated_stats';
export declare function IngestionRate({ definition, stats, isLoadingStats, timeState, aggregations, statsError, }: {
    definition: Streams.ingest.all.GetResponse;
    stats?: CalculatedStats;
    isLoadingStats: boolean;
    timeState: TimeState;
    aggregations?: StreamAggregations;
    statsError: Error | undefined;
}): React.JSX.Element;
