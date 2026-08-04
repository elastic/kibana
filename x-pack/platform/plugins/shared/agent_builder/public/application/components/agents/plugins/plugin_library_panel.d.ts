import React from 'react';
import type { PluginDefinition } from '@kbn/agent-builder-common';
interface PluginLibraryPanelProps {
    onClose: () => void;
    allPlugins: PluginDefinition[];
    activePluginIdSet: Set<string>;
    onTogglePlugin: (plugin: PluginDefinition, isActive: boolean) => void;
    autoPluginIdSet?: Set<string>;
}
export declare const PluginLibraryPanel: React.FC<PluginLibraryPanelProps>;
export {};
