import type { Connector } from '@kbn/actions-plugin/server';
import type { ConnectorItem } from '../../common/http_api/tools';
export declare const getTechnicalPreviewWarning: (featureName: string) => string;
/**
 * Timeout for agentic HTTP APIs - 15 mins
 */
export declare const AGENT_SOCKET_TIMEOUT_MS: number;
export declare const toConnectorItem: (connector: Connector) => ConnectorItem;
