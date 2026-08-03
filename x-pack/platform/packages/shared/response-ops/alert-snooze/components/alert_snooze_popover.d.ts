import React from 'react';
import type { AlertSnoozePayload } from './use_snooze_form';
export type { AlertSnoozePayload } from './use_snooze_form';
export interface AlertSnoozePopoverProps {
    onApply: (payload: AlertSnoozePayload) => void;
    /** alert field names for the `field_change` condition dropdown. */
    fieldOptions?: string[];
    isLoadingFields?: boolean;
}
export declare const AlertSnoozePopover: ({ onApply, fieldOptions, isLoadingFields, }: AlertSnoozePopoverProps) => React.JSX.Element;
