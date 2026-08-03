import React from 'react';
interface SandboxSettingsMenuProps {
    /** When true the base/alert split editor is active; the menu offers merging back. */
    manualSplitEnabled: boolean;
    /** Enable the base/alert split editor (disables automatic split on Apply). */
    onEnableManualSplit: () => void;
    /** Merge base + alert back into the unified editor (re-enables automatic split). */
    onDisableManualSplit: () => void;
}
/**
 * Settings (gear) menu for the query sandbox toolbar. Demotes the base/alert
 * split control behind a menu so it is no longer primary chrome — the unified
 * editor is the default create flow and manual split is an advanced opt-in.
 */
export declare const SandboxSettingsMenu: React.FC<SandboxSettingsMenuProps>;
export {};
