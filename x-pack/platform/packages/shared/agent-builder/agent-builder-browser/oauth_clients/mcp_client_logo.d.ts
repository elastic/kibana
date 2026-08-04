import React from 'react';
import type { IconSize } from '@elastic/eui';
import type { OAuthClientLogo } from '@kbn/agent-builder-common';
export interface McpClientLogoProps {
    clientLogo?: OAuthClientLogo;
    size?: IconSize;
}
export declare const McpClientLogo: ({ clientLogo, size }: McpClientLogoProps) => React.JSX.Element | null;
