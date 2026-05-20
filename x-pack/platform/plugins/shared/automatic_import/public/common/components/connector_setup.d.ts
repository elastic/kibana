import React from 'react';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
interface ConnectorSetupProps {
    onConnectorCreated?: (connector: ActionConnector) => void;
    onClose: () => void;
}
export declare const ConnectorSetup: React.FC<ConnectorSetupProps>;
export {};
