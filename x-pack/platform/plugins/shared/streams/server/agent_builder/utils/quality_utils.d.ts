import type { Streams } from '@kbn/streams-schema';
import type { IngestStreamEffectiveLifecycle } from '@kbn/streams-schema';
type QualityIndicators = 'good' | 'poor' | 'degraded';
export declare const computeQualityMetrics: ({ totalCount, degradedCount, failedCount, windowedTotalCount, }: {
    totalCount: number;
    degradedCount: number;
    failedCount: number;
    windowedTotalCount?: number;
}) => {
    degradedPct: number;
    failedPct: number;
    quality: QualityIndicators;
};
export declare const detectFailureStoreStatus: (definition: Streams.all.Definition) => string;
export declare const buildRetentionInfo: (lifecycle: IngestStreamEffectiveLifecycle) => Record<string, unknown>;
export declare const computeFailedPct: (failed: number, total: number) => number;
export declare const getQualityAssessment: (last5m: number, last24h: number, sinceUpdate: number | null, pct5m?: number, pct24h?: number) => string;
export declare const formatBytes: (bytes: number) => string;
export {};
