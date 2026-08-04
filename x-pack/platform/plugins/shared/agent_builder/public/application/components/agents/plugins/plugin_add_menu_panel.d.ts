import React from 'react';
export interface PluginAddMenuPanelProps {
    onInstallFromUrlOrZip: () => void;
    onAddFromLibrary: () => void;
}
export declare const PluginAddMenuPanel: React.FC<PluginAddMenuPanelProps>;
