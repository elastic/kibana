import React from 'react';
interface NamespaceFormRowProps {
    namespace?: string;
    placeholder?: string;
    isEditPage: boolean;
    packageType?: string;
    validationError?: string[] | null;
    docLinks?: {
        links: {
            fleet: {
                datastreamsNamingScheme: string;
            };
        };
    };
    onNamespaceChange: (namespace: string) => void;
    'data-test-subj'?: string;
    fullWidth?: boolean;
    labelId?: string;
    helpTextId?: string;
}
export declare const NamespaceComboBox: React.FC<NamespaceFormRowProps>;
export {};
