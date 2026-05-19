import React from 'react';
import type { OAuthClientLogo } from '@kbn/agent-builder-common';
export interface McpClientLogoProps {
    clientLogo?: OAuthClientLogo;
}
export declare const McpClientLogo: ({ clientLogo }: McpClientLogoProps) => React.JSX.Element | null;
