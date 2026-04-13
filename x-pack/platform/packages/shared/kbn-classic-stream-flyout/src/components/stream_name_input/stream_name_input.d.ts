import React from 'react';
import { type ValidationErrorType } from '../../utils';
export interface StreamNameInputProps {
    /** The index pattern containing wildcards (e.g., "*-logs-*-*") */
    indexPattern: string;
    /** Current wildcard part values (controlled) */
    parts: string[];
    /** Callback when wildcard parts change */
    onPartsChange: (parts: string[]) => void;
    /**
     * Validation error type. When 'empty', only empty inputs are highlighted.
     * For other error types, all inputs are highlighted.
     */
    validationError?: ValidationErrorType;
    /** Test subject prefix for the inputs */
    'data-test-subj'?: string;
}
export declare const StreamNameInput: ({ indexPattern, parts, onPartsChange, validationError, "data-test-subj": dataTestSubj, }: StreamNameInputProps) => React.JSX.Element;
