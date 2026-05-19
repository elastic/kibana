import React from 'react';
import type { PluginDefinition } from '@kbn/agent-builder-common';
interface InstallPluginFlyoutProps {
    onClose: () => void;
    /** Called after a plugin is successfully installed, receives the new plugin data.
     *  May return a promise — the flyout waits for it to settle before closing. */
    onPluginInstalled?: (plugin: PluginDefinition) => void | Promise<void>;
}
export declare const InstallPluginFlyout: React.FC<InstallPluginFlyoutProps>;
export {};
