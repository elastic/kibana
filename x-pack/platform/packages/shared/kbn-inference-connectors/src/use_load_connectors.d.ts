import type { UseQueryResult } from '@kbn/react-query';
import type { IHttpFetchError, HttpSetup } from '@kbn/core-http-browser';
import type { IToasts } from '@kbn/core-notifications-browser';
import type { SettingsStart } from '@kbn/core-ui-settings-browser';
import type { AIConnector } from './types';
/**
 * Props for {@link useLoadConnectors}.
 *
 * The hook calls an internal HTTP route registered by the `searchInferenceEndpoints` plugin.
 * Any Kibana plugin that uses this package must load that plugin (it is platform-shared and
 * enabled in standard distributions).
 */
export interface UseLoadConnectorsProps {
    http: HttpSetup;
    toasts?: IToasts;
    /**
     * Feature identifier used to scope which inference endpoints are relevant.
     * Passed to the search_inference_endpoints API to resolve feature-specific endpoints.
     */
    featureId: string;
    /**
     * @deprecated No longer read by the hook. Default-connector UI settings are now applied
     * server-side by the search_inference_endpoints connectors route. Kept for call-site
     * compatibility and will be removed in a follow-up.
     */
    settings?: SettingsStart;
}
export type UseLoadConnectorsResult = UseQueryResult<AIConnector[], IHttpFetchError> & {
    soEntryFound: boolean;
};
export declare const useLoadConnectors: ({ http, toasts, featureId, }: UseLoadConnectorsProps) => UseLoadConnectorsResult;
