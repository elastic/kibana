import React from 'react';
export interface PluginsCustomizeEmptyStateProps {
    canEditAgent: boolean;
    onAddFromLibrary: () => void;
    onInstallFromUrlOrZip: () => void;
}
export declare const PluginsCustomizeEmptyState: React.FC<PluginsCustomizeEmptyStateProps>;
