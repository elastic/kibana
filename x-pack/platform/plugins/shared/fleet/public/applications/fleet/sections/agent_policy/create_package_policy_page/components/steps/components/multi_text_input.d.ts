import type { FunctionComponent } from 'react';
interface Props {
    value: string[];
    onChange: (newValue: string[]) => void;
    fieldLabel: string;
    onBlur?: () => void;
    errors?: Array<{
        message: string;
        index?: number;
    }>;
    isInvalid?: boolean;
    isDisabled?: boolean;
    isSecret?: boolean;
    'data-test-subj'?: string;
}
export declare const MultiTextInput: FunctionComponent<Props>;
export {};
