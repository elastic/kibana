import React from 'react';
export interface DurationInputProps {
    value: string;
    onChange: (value: string) => void;
    /** Fallback duration string used when `value` is empty */
    fallback?: string;
    errors?: string;
    numberLabel?: string;
    unitAriaLabel: string;
    dataTestSubj: string;
    idPrefix: string;
    compressed?: boolean;
}
/**
 * A reusable duration input consisting of a number field and a time-unit select.
 *
 * Delegates number-input state management to `NumberInput`, which lets the user
 * freely clear and retype. The form value is only updated when the input
 * contains a valid positive integer. On blur, an empty or invalid value is
 * restored to the last valid form value.
 */
export declare const DurationInput: React.ForwardRefExoticComponent<DurationInputProps & React.RefAttributes<HTMLInputElement>>;
