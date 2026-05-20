import React from 'react';
import type { ConditionalSnoozeSchedule, DataConditionTypeDescriptor } from './types';
export type AlertSnoozePayload = ConditionalSnoozeSchedule;
export interface AlertSnoozePopoverProps {
    onApply: (payload: AlertSnoozePayload) => void;
    dataConditionTypes?: readonly DataConditionTypeDescriptor[];
}
export declare const AlertSnoozePopover: ({ onApply, dataConditionTypes }: AlertSnoozePopoverProps) => React.JSX.Element;
