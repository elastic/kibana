import React from 'react';
export declare const durationOutputOptions: {
    label: string;
    value: string;
}[];
export declare const durationInputOptions: {
    label: string;
    value: string;
}[];
interface DurationInputProps {
    testSubjLayout?: string;
    testSubjStart?: string;
    testSubjEnd?: string;
    onStartChange: (newStartValue: string) => void;
    onEndChange: (newEndValue: string) => void;
    startValue: string | undefined;
    endValue: string | undefined;
}
export declare const DurationRowInputs: ({ testSubjLayout, testSubjStart, testSubjEnd, startValue, endValue, onStartChange, onEndChange, }: DurationInputProps) => React.JSX.Element;
export {};
