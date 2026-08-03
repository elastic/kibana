import React from 'react';
import type { ConnectorItem } from '../../../../../common/http_api/tools';
export interface ConnectorContextMenuProps {
    connector: ConnectorItem;
}
export declare const ConnectorContextMenu: ({ connector }: ConnectorContextMenuProps) => React.JSX.Element;
