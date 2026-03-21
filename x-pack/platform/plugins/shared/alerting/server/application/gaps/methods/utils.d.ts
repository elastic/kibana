import type { AggregationsSumAggregate } from '@elastic/elasticsearch/lib/api/types';
import type { GapFillStatus } from '../../../../common';
export interface GapDurationSums {
    totalUnfilledDurationMs: number;
    totalInProgressDurationMs: number;
    totalFilledDurationMs: number;
    totalDurationMs: number;
}
/**
 * Extracts and normalizes gap duration sums from an aggregation bucket
 */
export declare function extractGapDurationSums(bucket: GapDurationBucket): GapDurationSums;
/**
 * Calculates aggregated gap fill status based on duration sums
 * Precedence: unfilled > in_progress > filled
 */
export declare function calculateHighestPriorityGapFillStatus(sums: GapDurationSums): GapFillStatus | null;
/**
 * Common aggregation fields for gap duration tracking
 */
export declare const RULE_GAP_AGGREGATIONS: {
    readonly totalUnfilledDurationMs: {
        readonly sum: {
            readonly field: "kibana.alert.rule.gap.unfilled_duration_ms";
        };
    };
    readonly totalInProgressDurationMs: {
        readonly sum: {
            readonly field: "kibana.alert.rule.gap.in_progress_duration_ms";
        };
    };
    readonly totalFilledDurationMs: {
        readonly sum: {
            readonly field: "kibana.alert.rule.gap.filled_duration_ms";
        };
    };
    readonly totalDurationMs: {
        readonly sum: {
            readonly field: "kibana.alert.rule.gap.total_gap_duration_ms";
        };
    };
};
export type GapDurationBucket = {
    key: string;
} & Partial<Record<keyof typeof RULE_GAP_AGGREGATIONS, AggregationsSumAggregate>>;
/**
 * Checks if the gap fill status of the bucket matches the given gap fill statuses
 */
export declare const hasMatchedGapFillStatus: (bucket: GapDurationBucket, gapFillStatuses: GapFillStatus[]) => boolean;
