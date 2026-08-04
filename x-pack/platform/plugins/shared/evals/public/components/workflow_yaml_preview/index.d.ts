import React from 'react';
export interface WorkflowYamlPreviewProps {
    yaml?: string;
    isLoading?: boolean;
    error?: string;
}
/**
 * Read-only, syntax-highlighted view of the workflow YAML that the server would
 * generate for the current experiment form. Used by the "Show workflow YAML" toggle.
 */
export declare const WorkflowYamlPreview: React.FC<WorkflowYamlPreviewProps>;
