import React from 'react';
import type { OAuthClient } from '@kbn/agent-builder-common';
export interface McpClientsNotConnectedBannerProps {
    clients: OAuthClient[];
}
export declare const McpClientsNotConnectedBanner: ({ clients }: McpClientsNotConnectedBannerProps) => React.JSX.Element | null;
