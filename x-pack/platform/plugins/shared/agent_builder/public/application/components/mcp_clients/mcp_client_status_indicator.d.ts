import React from 'react';
import type { EuiHealthProps } from '@elastic/eui';
import type { OAuthClient } from '@kbn/agent-builder-common';
export interface McpClientStatusValue {
    label: string;
    color: EuiHealthProps['color'];
}
export declare enum McpClientStatus {
    Active = "active",
    Revoked = "revoked"
}
export declare const mcpClientStatusValues: Record<McpClientStatus, McpClientStatusValue>;
export declare const getMcpClientStatus: ({ revoked }: Pick<OAuthClient, "revoked">) => McpClientStatus;
export interface McpClientStatusIndicatorProps {
    revoked?: boolean;
}
export declare const McpClientStatusIndicator: ({ revoked }: McpClientStatusIndicatorProps) => React.JSX.Element | null;
