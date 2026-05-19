import React from 'react';
interface MatcherInputProps {
    value: string;
    onChange: (value: string) => void;
    fullWidth?: boolean;
    placeholder?: string;
    'data-test-subj'?: string;
    dataFieldNames?: string[];
}
export declare const MatcherInput: ({ value, onChange, fullWidth, placeholder, "data-test-subj": dataTestSubj, dataFieldNames, }: MatcherInputProps) => React.JSX.Element;
export {};
