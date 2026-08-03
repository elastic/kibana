import React from 'react';
import type { OAuthClient } from '@kbn/agent-builder-common';
export type McpClientDetailsPresentation = 'modal' | 'flyout' | 'popover';
export type McpClientDetailsData = OAuthClient & {
    client_secret?: string;
};
export interface McpClientDetailsContentProps {
    clientDetails: McpClientDetailsData;
    presentation: McpClientDetailsPresentation;
}
export declare const McpClientDetailsContent: ({ clientDetails, presentation, }: McpClientDetailsContentProps) => React.JSX.Element;
