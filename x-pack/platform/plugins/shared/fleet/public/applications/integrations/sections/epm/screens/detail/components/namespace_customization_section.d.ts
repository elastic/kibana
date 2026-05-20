import React from 'react';
interface Props {
    savedNamespaces: string[];
    allowedNamespacePrefixes: string[];
    disabled?: boolean;
    isSubmitting?: boolean;
    onSave: (next: string[]) => void;
}
export declare const NamespaceCustomizationSection: React.FC<Props>;
export {};
