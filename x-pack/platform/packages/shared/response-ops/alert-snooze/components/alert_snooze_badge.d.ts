import React from 'react';
export interface AlertSnoozeBadgeProps {
    /** Human-readable summary of the alert's snooze/mute state, shown in the tooltip. */
    summary: string;
    'data-test-subj'?: string;
}
/**
 * A "bell slash" badge indicating an alert is snoozed or muted, with a tooltip
 * explaining until when / under which conditions. Shared between the alerts
 * table status cell and the alert details page header so both stay in sync.
 */
export declare const AlertSnoozeBadge: ({ summary, "data-test-subj": dataTestSubj, }: AlertSnoozeBadgeProps) => React.JSX.Element;
