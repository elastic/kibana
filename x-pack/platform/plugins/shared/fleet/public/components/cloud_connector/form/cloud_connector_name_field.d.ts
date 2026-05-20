import React from 'react';
interface CloudConnectorNameFieldProps {
    value: string;
    onChange: (name: string, isValid: boolean, validationError?: string) => void;
    disabled?: boolean;
    'data-test-subj'?: string;
}
export declare const CloudConnectorNameField: React.FC<CloudConnectorNameFieldProps>;
export {};
