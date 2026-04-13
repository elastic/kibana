import moment from 'moment';
import type { TimeState } from '@kbn/es-query';
import type { Streams, PhaseName } from '@kbn/streams-schema';
import type { ISearchStart } from '@kbn/data-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { CalculatedStats } from '../helpers/get_calculated_stats';
export interface StreamAggregations {
    buckets: Array<{
        key: number;
        doc_count: number;
    }>;
    interval: string;
}
export declare const useIngestionRate: ({ calculatedStats, timeState, isLoading, aggregations, error, }: {
    calculatedStats?: CalculatedStats;
    timeState: TimeState;
    isLoading: boolean;
    aggregations?: StreamAggregations;
    error: Error | undefined;
}) => {
    ingestionRate: {
        start: moment.Moment;
        end: moment.Moment;
        interval: string;
        buckets: {
            key: number;
            value: number;
        }[];
    } | undefined;
    isLoading: boolean;
    error: Error | undefined;
};
type PhaseNameWithoutDelete = Exclude<PhaseName, 'delete'>;
export declare const useIngestionRatePerTier: ({ definition, calculatedStats, timeState, isFailureStore, }: {
    definition: Streams.ingest.all.GetResponse;
    calculatedStats?: CalculatedStats;
    timeState: TimeState;
    isFailureStore?: boolean;
}) => {
    ingestionRate: {
        start: moment.Moment;
        end: moment.Moment;
        interval: string;
        buckets: {};
    } | {
        start: moment.Moment;
        end: moment.Moment;
        interval: string;
        buckets: Record<PhaseNameWithoutDelete, {
            key: number;
            value: number;
        }[]>;
    } | undefined;
    isLoading: boolean;
    error: Error | undefined;
};
export declare const getAggregations: ({ definition, timeState, totalDocs, isFailureStore, core, search, signal, }: {
    definition: Streams.ingest.all.GetResponse;
    timeState: TimeState;
    totalDocs?: number;
    isFailureStore?: boolean;
    core: CoreStart;
    search: ISearchStart;
    signal: AbortSignal;
}) => Promise<{
    buckets: {
        key: number;
        doc_count: number;
    }[];
    interval: string;
} | undefined>;
export {};
