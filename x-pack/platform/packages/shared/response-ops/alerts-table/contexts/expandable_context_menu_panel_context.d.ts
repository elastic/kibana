import type React from 'react';
export interface ExpandableContextMenuPanelContextValue {
    openPanel: (panel: React.ReactNode) => void;
    closePanel: () => void;
}
export declare const ExpandableContextMenuPanelProvider: React.Provider<ExpandableContextMenuPanelContextValue | undefined>;
/** Returns the expandable context menu panel context if available, or undefined otherwise. */
export declare const useExpandableContextMenuPanel: () => ExpandableContextMenuPanelContextValue | undefined;
