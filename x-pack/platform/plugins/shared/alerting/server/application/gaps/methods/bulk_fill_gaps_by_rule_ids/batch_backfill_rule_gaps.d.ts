import type { BulkFillGapsByRuleIdsParams } from './types';
import { BulkFillGapsScheduleResult } from './types';
import type { BulkGapFillError } from './utils';
import type { RulesClientContext } from '../../../../rules_client';
interface BatchBackfillRuleGapsParams {
    rule: {
        id: string;
        name: string;
    };
    range: BulkFillGapsByRuleIdsParams['range'];
    maxGapCountPerRule: number;
}
type BatchBackfillScheduleRuleGapsResult = {
    outcome: BulkFillGapsScheduleResult.BACKFILLED;
} | {
    outcome: BulkFillGapsScheduleResult.SKIPPED;
} | {
    outcome: BulkFillGapsScheduleResult.ERRORED;
    error: BulkGapFillError;
};
export declare const batchBackfillRuleGaps: (context: RulesClientContext, { rule, range, maxGapCountPerRule }: BatchBackfillRuleGapsParams) => Promise<BatchBackfillScheduleRuleGapsResult>;
export {};
