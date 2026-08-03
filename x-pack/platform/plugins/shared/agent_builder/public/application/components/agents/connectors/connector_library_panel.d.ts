import React from 'react';
import type { ConnectorItem } from '../../../../../common/http_api/tools';
interface ConnectorLibraryPanelProps {
    onClose: () => void;
    allConnectors: readonly ConnectorItem[];
    activeConnectorIdSet: Set<string>;
    onToggle: (connector: ConnectorItem, isActive: boolean) => void;
}
export declare const ConnectorLibraryPanel: React.FC<ConnectorLibraryPanelProps>;
export {};
