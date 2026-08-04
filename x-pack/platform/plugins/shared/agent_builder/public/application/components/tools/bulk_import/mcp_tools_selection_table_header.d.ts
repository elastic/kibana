import React from 'react';
export interface McpToolsSelectionTableHeaderProps {
    isLoading: boolean;
    pageIndex: number;
    pageSize: number;
    totalCount: number;
    selectedCount: number;
    onSelectAll: () => void;
    onClearSelection: () => void;
}
export declare const McpToolsSelectionTableHeader: React.NamedExoticComponent<McpToolsSelectionTableHeaderProps>;
