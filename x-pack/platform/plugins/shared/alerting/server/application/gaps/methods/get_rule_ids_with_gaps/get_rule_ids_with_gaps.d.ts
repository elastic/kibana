import type { RulesClientContext } from '../../../../rules_client';
import type { GetRuleIdsWithGapsParams } from './types';
export declare const RULE_SAVED_OBJECT_TYPE = "alert";
export declare function getRuleIdsWithGaps(context: RulesClientContext, params: GetRuleIdsWithGapsParams): Promise<Readonly<{
    latestGapTimestamp?: number | undefined;
} & {
    total: number;
    ruleIds: string[];
    summary: Readonly<{} & {
        totalUnfilledDurationMs: number;
        totalInProgressDurationMs: number;
        totalFilledDurationMs: number;
        totalErrorDurationMs: number;
        totalDurationMs: number;
        rulesByGapFillStatus: Readonly<{} & {
            unfilled: number;
            inProgress: number;
            filled: number;
            error: number;
        }>;
    }>;
}>>;
