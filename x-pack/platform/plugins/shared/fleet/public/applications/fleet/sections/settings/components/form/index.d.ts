import React from 'react';
import type { ReactNode } from 'react';
interface InputProps {
    label: ReactNode;
    placeholder?: string;
    dataTestSubj?: string;
    inputProps: {
        props: {
            onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
            value: string;
            isInvalid?: boolean;
            disabled?: boolean;
        };
        formRowProps: {
            error?: string[];
            isInvalid?: boolean;
        };
    };
}
export declare const TextInput: React.FunctionComponent<InputProps>;
export declare const TextAreaInput: React.FunctionComponent<InputProps>;
export {};
