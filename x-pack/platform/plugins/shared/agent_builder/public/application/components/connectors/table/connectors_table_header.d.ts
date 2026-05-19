import React from 'react';
import type { ConnectorItem } from '../../../../../common/http_api/tools';
export interface ConnectorsTableHeaderProps {
    isLoading: boolean;
    pageIndex: number;
    pageSize: number;
    connectors: ConnectorItem[];
    total: number;
    selectedConnectors: ConnectorItem[];
    setSelectedConnectors: (connectors: ConnectorItem[]) => void;
}
export declare const ConnectorsTableHeader: ({ isLoading, pageIndex, pageSize, connectors, total, selectedConnectors, setSelectedConnectors, }: ConnectorsTableHeaderProps) => React.JSX.Element;
