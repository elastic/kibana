import React from 'react';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
export interface ConnectorSelectorProps {
    path?: string;
    fullWidth?: boolean;
    isDisabled?: boolean;
    displayFancy?: (label: string, connector?: ActionConnector) => React.ReactNode;
}
export declare const ConnectorSelector: React.FC<ConnectorSelectorProps>;
