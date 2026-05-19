import React from 'react';
export interface SettingsSectionProps {
    enableElasticCapabilities: boolean;
    currentInstructions: string;
    showWorkflowSection: boolean;
    workflowIds: string[];
    canEditAgent: boolean;
    onOpenEditFlyout: () => void;
}
export declare const SettingsSection: React.FC<SettingsSectionProps>;
