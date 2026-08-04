import React from 'react';
import type { ActionConnector } from '@kbn/alerts-ui-shared';
import type { ConnectorItem } from '../../../common/http_api/tools';
export interface ConnectorsActionsContextType {
    openCreateFlyout: () => void;
    editConnector: (connector: ConnectorItem) => void;
    deleteConnector: (connector: ConnectorItem) => void;
    bulkDeleteConnectors: (connectors: ConnectorItem[]) => void;
    invalidateConnectors: () => void;
}
export declare const ConnectorsProvider: ({ children, onConnectorCreated, }: {
    children: React.ReactNode;
    onConnectorCreated?: (connector: ActionConnector) => void;
}) => React.JSX.Element;
export declare const useConnectorsActions: () => ConnectorsActionsContextType;
