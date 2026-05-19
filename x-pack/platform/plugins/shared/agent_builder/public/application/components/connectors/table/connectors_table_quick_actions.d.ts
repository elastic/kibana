import React from 'react';
import type { ConnectorItem } from '../../../../../common/http_api/tools';
export interface ConnectorQuickActionsProps {
    connector: ConnectorItem;
}
export declare const connectorQuickActionsHoverStyles: import("@emotion/react").SerializedStyles;
export declare const ConnectorQuickActions: ({ connector }: ConnectorQuickActionsProps) => React.JSX.Element;
