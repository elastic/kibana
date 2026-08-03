import React from 'react';
import type { ReactNode } from 'react';
interface DebouncedTemplateTextFieldProps {
    label: ReactNode;
    /** Source-of-truth value; the field re-syncs when it changes from outside (YAML edit, load). */
    value: string;
    /** Debounced — fired after the user pauses; also flushed on blur. */
    onChange: (value: string) => void;
    dataTestSubj: string;
    multiline?: boolean;
    /** Commit each keystroke immediately instead of waiting for the debounce delay. */
    commitOnChange?: boolean;
    isInvalid?: boolean;
    error?: ReactNode;
    helpText?: ReactNode;
}
/**
 * A form field whose keystrokes stay local to this component and only propagate (debounced) to the
 * parent on pause / blur. Isolating the field this way keeps typing instant even when the
 * surrounding form is heavy (async comboboxes, YAML re-serialization on change).
 */
export declare const DebouncedTemplateTextField: React.FC<DebouncedTemplateTextFieldProps>;
export {};
