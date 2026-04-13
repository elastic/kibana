import React from 'react';
export type AffectedResourceType = 'stream' | 'index';
export interface AffectedResource {
    name: string;
    type: AffectedResourceType;
}
export interface EditPolicyModalProps {
    affectedResources: AffectedResource[];
    isManaged?: boolean;
    isProcessing?: boolean;
    onCancel: () => void;
    onOverwrite: () => void;
    onSaveAsNew: () => void;
}
export declare function EditPolicyModal({ affectedResources, isManaged, isProcessing, onCancel, onOverwrite, onSaveAsNew, }: EditPolicyModalProps): React.JSX.Element;
