import React from 'react';
import type { CustomDurationState } from './types';
export type TimeConditionStatus = 'editing' | 'confirmed';
export interface TimeConditionState extends CustomDurationState {
    status: TimeConditionStatus;
}
export declare const NEW_TIME_CONDITION: TimeConditionState;
export interface TimeConditionPanelProps {
    value: TimeConditionState | null;
    chipLabel: string;
    isConditionInvalid: boolean;
    isDurationInvalid: boolean;
    isDateTimeInvalid: boolean;
    onChange: (newValue: TimeConditionState | null) => void;
}
export declare const TimeConditionPanel: ({ value, chipLabel, isConditionInvalid, isDurationInvalid, isDateTimeInvalid, onChange, }: TimeConditionPanelProps) => React.JSX.Element;
