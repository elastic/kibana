import React from 'react';
export interface NumberInputProps {
    value: number;
    onChange: (value: number) => void;
    /** Return false to reject the parsed value before it reaches onChange. */
    validate?: (value: number) => boolean;
    isInvalid?: boolean;
    fullWidth?: boolean;
    min?: number;
    max?: number;
    step?: number;
    prepend?: string | React.ReactElement | Array<string | React.ReactElement>;
    compressed?: boolean;
    'data-test-subj'?: string;
    id?: string;
    name?: string;
    'aria-label'?: string;
}
/**
 * A positive-integer number input with local display state.
 *
 * Manages a local string value so the user can freely clear and retype.
 * The parent onChange is only called when the input is a valid positive integer
 * (and passes the optional validate check).
 * On blur, an empty or invalid value restores the last valid value.
 */
export declare const NumberInput: React.ForwardRefExoticComponent<NumberInputProps & React.RefAttributes<HTMLInputElement>>;
