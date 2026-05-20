import React from 'react';
import type { IntegrationCardItem } from '../../screens/home';
interface GridColumnProps {
    list: IntegrationCardItem[];
    isLoading: boolean;
    showMissingIntegrationMessage?: boolean;
    showCardLabels?: boolean;
    scrollElementId?: string;
    emptyStateStyles?: Record<string, string>;
    columnCount?: 1 | 2 | 3;
    gutterSize?: 's' | 'm';
}
export declare const GridColumn: ({ list, showMissingIntegrationMessage, showCardLabels, isLoading, scrollElementId, emptyStateStyles, columnCount, gutterSize, }: GridColumnProps) => React.JSX.Element;
export {};
