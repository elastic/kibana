import React from 'react';
export declare const LabelInput: ({ value, onChange, placeholder, inputRef, onSubmit, dataTestSubj, compressed, }: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    inputRef?: React.MutableRefObject<HTMLInputElement | undefined>;
    onSubmit?: () => void;
    dataTestSubj?: string;
    compressed?: boolean;
}) => React.JSX.Element;
