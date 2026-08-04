import React from 'react';
interface WorkflowReferenceSelectorProps {
    value: string | null;
    onSelect: (workflowId: string | null) => void;
    isInvalid?: boolean;
    errorMessage?: string;
}
export declare const WorkflowReferenceSelector: ({ value, onSelect, isInvalid, errorMessage, }: WorkflowReferenceSelectorProps) => React.JSX.Element;
export {};
