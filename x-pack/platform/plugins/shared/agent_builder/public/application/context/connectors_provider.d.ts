import React from 'react';
import type { ConnectorItem } from '../../../common/http_api/tools';
export interface ConnectorsActionsContextType {
    openCreateFlyout: () => void;
    editConnector: (connector: ConnectorItem) => void;
    deleteConnector: (connector: ConnectorItem) => void;
    bulkDeleteConnectors: (connectors: ConnectorItem[]) => void;
    invalidateConnectors: () => void;
}
export declare const ConnectorsProvider: ({ children }: {
    children: React.ReactNode;
}) => React.JSX.Element;
export declare const useConnectorsActions: () => ConnectorsActionsContextType;
