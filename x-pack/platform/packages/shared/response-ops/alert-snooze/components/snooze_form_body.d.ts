import React from 'react';
import type { ConditionalSnoozeSchedule, SnoozePanelTab } from './types';
/** Fixed width so the panel doesn't resize when switching between tabs. */
export declare const SNOOZE_PANEL_WIDTH = 480;
export interface SnoozeFormBodyProps {
    activeTab: SnoozePanelTab;
    onTabChange: (tab: SnoozePanelTab) => void;
    onQuickScheduleChange: (endDate: string | null | undefined) => void;
    onConditionalScheduleChange: (schedule: ConditionalSnoozeSchedule | undefined) => void;
    /** Leaf-level scalar alert field names for the `field_change` condition dropdown. */
    fieldOptions?: string[];
    isLoadingFields?: boolean;
}
/**
 * The tabbed snooze form body (Quick / Condition-based) shared by
 * `AlertSnoozePopover` and `AlertSnoozePanelInline`. It is purely presentational;
 * form state lives in `useSnoozeForm`.
 */
export declare const SnoozeFormBody: ({ activeTab, onTabChange, onQuickScheduleChange, onConditionalScheduleChange, fieldOptions, isLoadingFields, }: SnoozeFormBodyProps) => React.JSX.Element;
