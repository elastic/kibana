import type { Connector } from '@kbn/actions-plugin/server';
import type { ConnectorItem, OAuthStatus } from '../../common/http_api/tools';
export declare const getTechnicalPreviewWarning: (featureName: string) => string;
/**
 * Timeout for agentic HTTP APIs - 15 mins
 */
export declare const AGENT_SOCKET_TIMEOUT_MS: number;
/**
 * Returns the headers needed for SSE streaming responses.
 * On cloud, uses `application/octet-stream` to avoid proxy compression breaking chunked encoding.
 */
export declare const getSSEResponseHeaders: (isCloud: boolean) => Record<string, string>;
export declare const toConnectorItem: (connector: Connector, options?: {
    oauthStatus?: OAuthStatus;
}) => ConnectorItem;
