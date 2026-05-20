import type { MlClient } from '../../lib/ml_client';
export interface GetScoresByBucketRequest {
    jobIds: string[];
    earliestMs: number;
    latestMs: number;
    intervalMs: number;
    perPage?: number;
    fromPage?: number;
    swimLaneSeverity?: Array<{
        min: number;
        max?: number;
    }>;
}
export interface GetInfluencerValueMaxScoreByTimeRequest {
    jobIds: string[];
    influencerFieldName: string;
    influencerFieldValues?: string[];
    earliestMs: number;
    latestMs: number;
    intervalMs: number;
    maxResults?: number;
    perPage?: number;
    fromPage?: number;
    influencersFilterQuery?: unknown;
    swimLaneSeverity?: Array<{
        min: number;
        max?: number;
    }>;
}
export declare function getScoresByBucket(mlClient: MlClient, { jobIds, earliestMs, latestMs, intervalMs, perPage, fromPage, swimLaneSeverity, }: GetScoresByBucketRequest): Promise<{
    results: Record<string, Record<number, number>>;
    cardinality: any;
}>;
export declare function getInfluencerValueMaxScoreByTime(mlClient: MlClient, { jobIds, influencerFieldName, influencerFieldValues, earliestMs, latestMs, intervalMs, maxResults, perPage, fromPage, influencersFilterQuery, swimLaneSeverity, }: GetInfluencerValueMaxScoreByTimeRequest): Promise<{
    results: Record<string, Record<number, number>>;
    cardinality: any;
}>;
