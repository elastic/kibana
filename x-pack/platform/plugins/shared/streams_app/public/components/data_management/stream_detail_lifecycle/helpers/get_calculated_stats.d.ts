import type { TimeState } from '@kbn/es-query';
export interface CalculatedStats {
    bytesPerDoc: number;
    bytesPerDay: number;
    perDayDocs: number;
}
export declare const getCalculatedStats: ({ stats, timeState, buckets, }: {
    stats: {
        creationDate?: number;
        totalDocs?: number;
        sizeBytes?: number;
    };
    timeState: TimeState;
    buckets?: Array<{
        key: number;
        doc_count: number;
    }>;
}) => CalculatedStats;
