import React from 'react';
export type DurationUnit = 'm' | 'h' | 'd';
export declare const computeSnoozedUntil: (value: number, unit: DurationUnit) => string;
export declare const UNIT_OPTIONS: Array<{
    value: DurationUnit;
    text: string;
}>;
export declare const COMMON_SNOOZE_TIMES: Array<{
    label: string;
    value: number;
    unit: DurationUnit;
}>;
export declare const formatSnoozeDate: (dateStr: string) => string;
export declare const formatSnoozeFullDate: (dateStr: string) => string;
interface ActionPolicySnoozeFormProps {
    isSnoozed: boolean;
    onApplySnooze: (snoozedUntil: string) => void;
    onCancelSnooze: () => void;
}
export declare const ActionPolicySnoozeForm: ({ isSnoozed, onApplySnooze, onCancelSnooze, }: ActionPolicySnoozeFormProps) => React.JSX.Element;
export {};
