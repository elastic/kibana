import React from 'react';
import type { ConnectorItem } from '../../../../../common/http_api/tools';
interface ActiveConnectorRowProps {
    connector: ConnectorItem;
    isSelected: boolean;
    onSelect: (connector: ConnectorItem) => void;
    onRemove: (connector: ConnectorItem) => void;
    canEditAgent: boolean;
}
export declare const ActiveConnectorRow: React.FC<ActiveConnectorRowProps>;
export {};
