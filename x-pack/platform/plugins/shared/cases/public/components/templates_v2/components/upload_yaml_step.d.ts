import React from 'react';
import type { ValidatedFile, FileValidationError } from '../hooks/use_validate_yaml';
export interface UploadYamlStepProps {
    validatedFiles: ValidatedFile[];
    validationErrors: FileValidationError[];
    isValidating: boolean;
    onValidationStart: () => void;
    onValidationComplete: (result: {
        validFiles: ValidatedFile[];
        errors: FileValidationError[];
    }) => void;
}
export declare const UploadYamlStep: React.NamedExoticComponent<UploadYamlStepProps>;
