import type { Streams } from '@kbn/streams-schema';
import type { DataStreamStatServiceResponse } from '@kbn/dataset-quality-plugin/public';
import { type FailureStoreStatsResponse } from '@kbn/streams-schema/src/models/ingest/failure_store';
import type { TimeState } from '@kbn/es-query';
import type { CalculatedStats } from '../helpers/get_calculated_stats';
export type DataStreamStats = DataStreamStatServiceResponse['dataStreamsStats'][number];
export type EnhancedDataStreamStats = DataStreamStats & CalculatedStats;
export type EnhancedFailureStoreStats = FailureStoreStatsResponse & CalculatedStats;
export declare const useDataStreamStats: ({ definition, timeState, }: {
    definition: Streams.ingest.all.GetResponse;
    timeState: TimeState;
}) => {
    stats: {
        ds: {
            stats: {
                bytesPerDoc: number;
                bytesPerDay: number;
                perDayDocs: number;
                sizeBytes: number;
                size: string;
                name: string;
                userPrivileges: {
                    canMonitor: boolean;
                    canReadFailureStore: boolean;
                    canManageFailureStore: boolean;
                };
                lastActivity?: number | undefined;
                integration?: string | undefined;
                totalDocs?: number | undefined;
                creationDate?: number | undefined;
                hasFailureStore?: boolean | undefined;
                customRetentionPeriod?: string | undefined;
                defaultRetentionPeriod?: string | undefined;
            };
            aggregations: {
                buckets: {
                    key: number;
                    doc_count: number;
                }[];
                interval: string;
            } | undefined;
        };
        fs: {
            stats: {
                bytesPerDoc: number;
                bytesPerDay: number;
                perDayDocs: number;
                size?: number;
                count?: number;
                creationDate?: number;
            } | undefined;
            aggregations: {
                buckets: {
                    key: number;
                    doc_count: number;
                }[];
                interval: string;
            } | undefined;
        };
    } | undefined;
    isLoading: boolean;
    refresh: () => void;
    error: Error | undefined;
};
