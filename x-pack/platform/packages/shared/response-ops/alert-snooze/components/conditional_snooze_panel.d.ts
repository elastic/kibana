import React from 'react';
import type { ConditionalSnoozeSchedule, SnoozeCondition } from './types';
export type { ConditionalSnoozeSchedule, SnoozeCondition };
export type { TimeConditionState } from './time_condition_panel';
export interface ConditionalSnoozePanelProps {
    /**
     * Called with the current snooze schedule whenever the conditions change.
     * `undefined` means no valid conditions are confirmed (button should be disabled).
     */
    onScheduleChange: (schedule: ConditionalSnoozeSchedule | undefined) => void;
    /**
     * Leaf-level scalar alert field names offered in the `field_change` condition's
     * field dropdown. Consumers fetch these and pass them down; the package itself
     * stays data-agnostic.
     */
    fieldOptions?: string[];
    /** Whether the alert field names are still being fetched by the consumer. */
    isLoadingFields?: boolean;
}
export declare const ConditionalSnoozePanel: ({ onScheduleChange, fieldOptions, isLoadingFields, }: ConditionalSnoozePanelProps) => React.JSX.Element;
