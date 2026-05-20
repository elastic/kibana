import React from 'react';
interface CollectorsStatusBarProps {
    totalCount: number;
    dataUpdatedAt: number;
    isAutoRefreshOn: boolean;
    onAutoRefreshChange: (on: boolean) => void;
}
export declare const CollectorsStatusBar: React.FC<CollectorsStatusBarProps>;
export {};
