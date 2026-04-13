import React, { type ReactNode } from 'react';
export interface ProcessorFieldSelectorProps {
    fieldKey?: string;
    helpText?: string;
    placeholder?: string;
    label?: string;
    onChange?: (value: string) => void;
    labelAppend?: ReactNode;
    processorId?: string;
}
export declare const ProcessorFieldSelector: ({ fieldKey, helpText, placeholder, label, onChange, labelAppend, processorId: processorIdProp, }: ProcessorFieldSelectorProps) => React.JSX.Element;
