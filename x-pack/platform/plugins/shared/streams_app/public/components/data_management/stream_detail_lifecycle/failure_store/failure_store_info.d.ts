import React from 'react';
import type { Streams } from '@kbn/streams-schema';
import type { TimeState } from '@kbn/es-query';
import type { StreamAggregations } from '../hooks/use_ingestion_rate';
import type { EnhancedFailureStoreStats } from '../hooks/use_data_stream_stats';
import type { useFailureStoreConfig } from '../hooks/use_failure_store_config';
export declare const FailureStoreInfo: ({ openModal, definition, statsError, isLoadingStats, stats, timeState, aggregations, failureStoreConfig, }: {
    openModal: (show: boolean) => void;
    definition: Streams.ingest.all.GetResponse;
    statsError: Error | undefined;
    isLoadingStats: boolean;
    stats?: EnhancedFailureStoreStats;
    timeState: TimeState;
    aggregations?: StreamAggregations;
    failureStoreConfig: ReturnType<typeof useFailureStoreConfig>;
}) => React.JSX.Element;
