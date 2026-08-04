import type { SnoozeCondition } from '../components/types';
export interface BuildSnoozeSummaryParams {
    isMuted?: boolean | null;
    expiresAt?: string | null;
    conditions?: SnoozeCondition[];
    conditionOperator?: 'any' | 'all';
}
/**
 * Builds a human-readable summary string for an alert's snooze state, matching
 * the language used in the snooze popover's preview sentence.
 */
export declare const buildSnoozeSummary: ({ isMuted, expiresAt, conditions, conditionOperator, }: BuildSnoozeSummaryParams) => string;
