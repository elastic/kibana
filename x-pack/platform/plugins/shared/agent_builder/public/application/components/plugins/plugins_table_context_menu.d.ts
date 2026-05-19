import type { PluginDefinition } from '@kbn/agent-builder-common';
import React from 'react';
interface PluginContextMenuProps {
    plugin: PluginDefinition;
    onDelete: (pluginId: string, pluginName: string, options?: {
        onConfirm?: () => void;
        onCancel?: () => void;
    }) => void;
    canManage: boolean;
}
export declare const PluginContextMenu: React.FC<PluginContextMenuProps>;
export {};
