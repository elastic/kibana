import React from 'react';
export type { SnoozeUnit, QuickDurationId, CustomSnoozeMode, CustomDurationState } from './types';
export interface QuickSnoozePanelProps {
    /**
     * Called with the current snooze end date whenever the selection changes.
     * `undefined` means the selection is invalid (button should be disabled).
     * `null` means indefinite snooze.
     */
    onScheduleChange: (endDate: string | null | undefined) => void;
}
export declare const QuickSnoozePanel: ({ onScheduleChange }: QuickSnoozePanelProps) => React.JSX.Element;
