import type { HttpSetup } from '@kbn/core-http-browser';
import type { SettingsStart } from '@kbn/core-ui-settings-browser';
import type { ApiInferenceConnector } from '@kbn/inference-common';
import type { AIConnector } from './types';
export declare const toAIConnector: (connector: ApiInferenceConnector) => AIConnector;
/**
 * Fetches AI connectors for a given feature from the search_inference_endpoints backend
 * and maps them to {@link AIConnector}. The backend route applies feature resolution,
 * default-connector UI settings, and recommended-endpoint flagging.
 *
 * @param settings - Deprecated; no longer read. Default-connector UI settings are applied
 *                   server-side. Kept for call-site compatibility.
 */
export declare const loadConnectors: ({ http, featureId, }: {
    http: HttpSetup;
    featureId: string;
    settings?: SettingsStart;
}) => Promise<AIConnector[]>;
