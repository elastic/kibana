import type { HttpSetup } from '@kbn/core-http-browser';
import type { ApiInferenceConnector } from '@kbn/inference-common';
export interface FetchConnectorsForFeatureResult {
    connectors: ApiInferenceConnector[];
    soEntryFound: boolean;
}
export declare const fetchConnectorsForFeature: (http: HttpSetup, featureId: string) => Promise<FetchConnectorsForFeatureResult>;
