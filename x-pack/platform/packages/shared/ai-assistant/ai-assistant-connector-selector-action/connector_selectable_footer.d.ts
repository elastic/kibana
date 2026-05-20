import React from 'react';
export interface ConnectorSelectableFooterProps {
    /** Callback when the "Add Connector" button is clicked */
    onAddConnectorClick?: () => void;
    /** Callback when the "Manage Connectors" button is clicked */
    onManageConnectorsClick?: () => void;
}
export declare const ConnectorSelectableFooter: React.FC<ConnectorSelectableFooterProps>;
