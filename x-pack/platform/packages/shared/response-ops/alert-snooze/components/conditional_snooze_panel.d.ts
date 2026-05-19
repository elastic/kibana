import React from 'react';
import type { ConditionalSnoozeSchedule, DataConditionTypeDescriptor, SnoozeCondition } from './types';
export type { ConditionalSnoozeSchedule, SnoozeCondition };
export type { TimeConditionState } from './time_condition_panel';
export interface ConditionalSnoozePanelProps {
    /**
     * Called with the current snooze schedule whenever the conditions change.
     * `undefined` means no valid conditions are confirmed (button should be disabled).
     */
    onScheduleChange: (schedule: ConditionalSnoozeSchedule | undefined) => void;
    /**
     * Set of data-condition descriptors available in the type dropdown.
     * Pass a custom list to add domain-specific types.
     */
    dataConditionTypes?: readonly DataConditionTypeDescriptor[];
}
export declare const ConditionalSnoozePanel: ({ onScheduleChange, dataConditionTypes, }: ConditionalSnoozePanelProps) => React.JSX.Element;
