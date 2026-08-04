import React from 'react';
import type { ConnectorItem } from '../../../../../common/http_api/tools';
interface ConnectorDetailPanelProps {
    connector: ConnectorItem;
    agentId: string;
    onRemove: (connector: ConnectorItem) => void;
    canEditAgent: boolean;
}
export declare const ConnectorDetailPanel: React.FC<ConnectorDetailPanelProps>;
export {};
