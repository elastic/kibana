import React from 'react';
import type { EuiHealthProps } from '@elastic/eui';
import type { OAuthClient, OAuthClientConnectionsSummary } from '@kbn/agent-builder-common';
export interface McpClientStatusValue {
    label: string;
    color: EuiHealthProps['color'];
}
export declare enum McpClientStatus {
    Connected = "connected",
    Revoked = "revoked"
}
export declare const mcpClientStatusValues: Record<McpClientStatus, McpClientStatusValue>;
export declare const getMcpClientStatus: ({ revoked, connections, }: Pick<OAuthClient, "revoked" | "connections">) => McpClientStatus | null;
export interface McpClientStatusIndicatorProps {
    revoked?: boolean;
    connections?: OAuthClientConnectionsSummary;
}
export declare const McpClientStatusIndicator: ({ revoked, connections, }: McpClientStatusIndicatorProps) => React.JSX.Element | null;
