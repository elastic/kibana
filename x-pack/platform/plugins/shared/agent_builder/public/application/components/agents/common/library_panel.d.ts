import React from 'react';
export interface LibraryItem {
    id: string;
    description: string;
}
export interface LibraryPanelLabels {
    title: string;
    manageLibraryLink: string;
    searchPlaceholder: string;
    availableSummary: (filtered: number, total: number) => React.ReactNode;
    noMatchMessage: string;
    noItemsMessage: string;
    disabledBadgeLabel?: string;
    disabledTooltipTitle?: string;
    disabledTooltipBody?: string;
}
export interface LibraryPanelProps<T extends LibraryItem> {
    onClose: () => void;
    allItems: T[];
    activeItemIdSet: Set<string>;
    onToggleItem: (item: T, isActive: boolean) => void;
    flyoutTitleId: string;
    libraryLabels: LibraryPanelLabels;
    manageLibraryPath: string;
    getItemName?: (item: T) => string;
    getSearchableText?: (item: T) => string[];
    disabledItemIdSet?: Set<string>;
    readOnlyItemIdSet?: Set<string>;
    callout?: React.ReactNode;
}
export declare const LibraryPanel: <T extends LibraryItem>({ onClose, allItems, activeItemIdSet, onToggleItem, flyoutTitleId, libraryLabels, manageLibraryPath, getItemName, getSearchableText, disabledItemIdSet, readOnlyItemIdSet, callout, }: LibraryPanelProps<T>) => React.JSX.Element;
