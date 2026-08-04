import type { ConditionalSnoozeSchedule, SnoozePanelTab } from './types';
export type AlertSnoozePayload = ConditionalSnoozeSchedule;
/**
 * Shared form state for the snooze UI (tabs + payload building), used by both
 * `AlertSnoozePopover` and `AlertSnoozePanelInline` so their form logic stays in
 * one place. The chrome around the form (popover vs inline back/footer) is owned
 * by each consumer.
 */
export declare const useSnoozeForm: (onApply: (payload: AlertSnoozePayload) => void) => {
    activeTab: SnoozePanelTab;
    setActiveTab: import("react").Dispatch<import("react").SetStateAction<SnoozePanelTab>>;
    setQuickEndDate: import("react").Dispatch<import("react").SetStateAction<string | null | undefined>>;
    setConditionalSchedule: import("react").Dispatch<import("react").SetStateAction<ConditionalSnoozeSchedule | undefined>>;
    isApplyDisabled: boolean;
    applySnooze: () => boolean;
};
