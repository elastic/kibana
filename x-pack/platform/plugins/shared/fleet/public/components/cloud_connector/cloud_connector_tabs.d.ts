import React from 'react';
import type { CloudProvider } from '../../types';
export interface CloudConnectorTab {
    id: 'new-connection' | 'existing-connection';
    name: string | React.ReactNode;
    content: React.ReactNode;
}
export interface CloudConnectorTabsProps {
    tabs: CloudConnectorTab[];
    selectedTabId: string;
    onTabClick: (tab: CloudConnectorTab) => void;
    isEditPage: boolean;
    cloudProvider?: CloudProvider;
    cloudConnectorsCount: number;
}
export declare const CloudConnectorTabs: React.FC<CloudConnectorTabsProps>;
