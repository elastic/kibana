import React from 'react';
interface DurationInputProps {
    value: string;
    onChange: (value: string) => void;
    isInvalid?: boolean;
    'data-test-subj'?: string;
}
export declare function DurationInput({ value, onChange, isInvalid, 'data-test-subj': dataTestSubj, }: DurationInputProps): React.JSX.Element;
export {};
