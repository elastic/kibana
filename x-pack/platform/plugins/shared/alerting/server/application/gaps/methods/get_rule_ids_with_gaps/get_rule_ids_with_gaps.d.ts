import type { RulesClientContext } from '../../../../rules_client';
import type { GetRuleIdsWithGapsParams } from './types';
export declare const RULE_SAVED_OBJECT_TYPE = "alert";
export declare function getRuleIdsWithGaps(context: RulesClientContext, params: GetRuleIdsWithGapsParams): Promise<Readonly<{
    latestGapTimestamp?: number | undefined;
} & {
    total: number;
    summary: Readonly<{} & {
        totalUnfilledDurationMs: number;
        totalInProgressDurationMs: number;
        totalFilledDurationMs: number;
        totalDurationMs: number;
        rulesByGapFillStatus: Readonly<{} & {
            inProgress: number;
            unfilled: number;
            filled: number;
        }>;
    }>;
    ruleIds: string[];
}>>;
