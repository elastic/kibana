import type { ConditionalSnoozeSchedule, DataConditionEntry, DataConditionTypeDescriptor } from '../components/types';
import type { TimeConditionState } from '../components/time_condition_panel';
/**
 * Human-readable label for the chip shown next to a confirmed time condition,
 * e.g. "after 2 hours" or "May 20, 2026 at 4:00 AM".
 */
export declare const buildTimeChipLabel: (timeCondition: TimeConditionState | null) => string;
export interface BuildPreviewSentencesArgs {
    confirmedDataConditions: readonly DataConditionEntry[];
    descriptorById: ReadonlyMap<string, DataConditionTypeDescriptor>;
    conditionOperator: 'any' | 'all';
    /**
     * ISO string of the time condition's resolved end date, or `null` when the
     * time condition is missing/invalid/unconfirmed.
     */
    timeEndDate: string | null;
}
/**
 * Compose the user-facing preview sentence(s) for the confirmed snooze
 * conditions. Returns the i18n footer hint when there's nothing to preview,
 * so the caller can render a stable array.
 */
export declare const buildPreviewSentences: ({ confirmedDataConditions, descriptorById, conditionOperator, timeEndDate, }: BuildPreviewSentencesArgs) => string[];
export interface BuildConditionalSnoozeScheduleArgs {
    /**
     * `true` when the user has confirmed a time condition AND it is valid.
     */
    hasConfirmedTimeCondition: boolean;
    /**
     * ISO string of the time condition's resolved end date, or `null`.
     * Required when `hasConfirmedTimeCondition` is true.
     */
    timeEndDate: string | null;
    dataConditions: readonly DataConditionEntry[];
    descriptorById: ReadonlyMap<string, DataConditionTypeDescriptor>;
    conditionOperator: 'any' | 'all';
}
/**
 * Build the final `ConditionalSnoozeSchedule` payload from raw panel state.
 * Returns `undefined` when there is nothing valid to emit so the caller can
 * disable the apply button without further branching.
 */
export declare const buildConditionalSnoozeSchedule: ({ hasConfirmedTimeCondition, timeEndDate, dataConditions, descriptorById, conditionOperator, }: BuildConditionalSnoozeScheduleArgs) => ConditionalSnoozeSchedule | undefined;
