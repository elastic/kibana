import React from 'react';
import type { Streams } from '@kbn/streams-schema';
import type { TimeState } from '@kbn/es-query';
import type { StreamAggregations } from '../hooks/use_ingestion_rate';
import type { EnhancedFailureStoreStats } from '../hooks/use_data_stream_stats';
export declare function FailureStoreIngestionRate({ definition, stats, isLoadingStats, timeState, aggregations, statsError, }: {
    definition: Streams.ingest.all.GetResponse;
    stats?: EnhancedFailureStoreStats;
    isLoadingStats: boolean;
    timeState: TimeState;
    aggregations?: StreamAggregations;
    statsError: Error | undefined;
}): React.JSX.Element;
