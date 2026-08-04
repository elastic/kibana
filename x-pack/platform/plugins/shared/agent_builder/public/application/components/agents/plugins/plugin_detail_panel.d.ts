import React from 'react';
interface PluginDetailPanelProps {
    pluginId: string;
    onRemove: () => void;
    isAuto?: boolean;
}
export declare const PluginDetailPanel: React.FC<PluginDetailPanelProps>;
export {};
