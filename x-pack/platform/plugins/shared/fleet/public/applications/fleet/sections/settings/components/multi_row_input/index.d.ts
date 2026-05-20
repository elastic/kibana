import type { ReactNode, FunctionComponent } from 'react';
export interface MultiRowInputProps {
    id: string;
    value: string[];
    onChange: (newValue: string[]) => void;
    label?: string;
    helpText?: ReactNode;
    errors?: Array<{
        message: string;
        index?: number;
    }>;
    isInvalid?: boolean;
    disabled?: boolean;
    placeholder?: string;
    multiline?: boolean;
    sortable?: boolean;
    isUrl?: boolean;
}
export declare const MultiRowInput: FunctionComponent<MultiRowInputProps>;
