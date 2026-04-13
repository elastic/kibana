import type { TimeState } from '@kbn/es-query';
import type { Streams } from '@kbn/streams-schema';
import moment from 'moment';
import React from 'react';
import type { StreamAggregations } from '../hooks/use_ingestion_rate';
import type { CalculatedStats } from '../helpers/get_calculated_stats';
interface IngestionRateBuckets {
    start: moment.Moment;
    end: moment.Moment;
    interval: string;
    buckets: Array<{
        key: number;
        value: number;
    }>;
}
interface ChartComponentProps {
    definition: Streams.ingest.all.GetResponse;
    timeState: TimeState;
    isLoadingStats: boolean;
    stats?: CalculatedStats;
    aggregations?: StreamAggregations;
    statsError: Error | undefined;
}
export declare function ChartBarSeries({ stats, timeState, isLoadingStats, aggregations, statsError, }: ChartComponentProps): React.JSX.Element;
export declare function FailureStoreChartBarSeries({ stats, timeState, isLoadingStats, aggregations, statsError, }: ChartComponentProps): React.JSX.Element;
export declare function ChartBarSeriesBase({ ingestionRate, isLoadingIngestionRate, ingestionRateError, isLoadingStats, formatAsBytes, isFailureStore, }: {
    ingestionRate: IngestionRateBuckets | undefined;
    isLoadingIngestionRate: boolean;
    ingestionRateError: Error | undefined;
    isLoadingStats: boolean;
    formatAsBytes?: boolean;
    isFailureStore: boolean;
}): React.JSX.Element | "Failed to load ingestion rate";
export declare function ChartBarPhasesSeries({ definition, stats, timeState, isLoadingStats, }: ChartComponentProps): React.JSX.Element;
export {};
