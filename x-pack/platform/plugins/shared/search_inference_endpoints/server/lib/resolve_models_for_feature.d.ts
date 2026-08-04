import type { IUiSettingsClient, Logger } from '@kbn/core/server';
import type { InferenceConnector } from '@kbn/inference-common';
import { type ApiInferenceConnector } from './merge_connectors';
import type { ResolvedInferenceEndpoints } from '../types';
export interface ResolvedConnectorsForFeature {
    connectors: ApiInferenceConnector[];
    warnings: string[];
    soEntryFound: boolean;
}
/**
 * Resolves the full, ordered model list for a feature.
 *
 * The priority resolution is:
 *   - If the default only setting is enabled, return just the default connector (or nothing if not set).
 *   - If there's a saved object entry for the feature, return that list.
 *   - If `ignoreGlobalDefault` is true, skip prepending the global default connector.
 *   - If there's a global default, return that and the feature-recommended models with isRecommended set to true, followed by the rest of the available models.
 *   - If there's no global default, return the feature-recommended models with isRecommended set to true, followed by the rest of the available models.
 *   - If there are no recommended models and no global default, return the full list of available models.
 *
 * Used by both the `GET /internal/search_inference_endpoints/connectors`
 * HTTP endpoint and the `endpoints.getForFeature` server-side contract.
 *
 * @param getForFeature  Resolves feature-specific endpoints (without the global default).
 * @param getConnectorList  Returns the full connector catalog.
 * @param getConnectorById  Fetches a single connector by ID (used for the global default).
 * @param uiSettingsClient  Scoped UI-settings client to read the default connector setting.
 * @param featureId  The feature to resolve connectors for.
 * @param logger  Logger for warnings/errors.
 */
export declare const resolveModelsForFeature: ({ getForFeature, getConnectorList, getConnectorById, uiSettingsClient, featureId, ignoreGlobalDefault, logger, }: {
    getForFeature: (featureId: string) => Promise<ResolvedInferenceEndpoints>;
    getConnectorList: () => Promise<InferenceConnector[]>;
    getConnectorById: (id: string) => Promise<InferenceConnector>;
    uiSettingsClient: IUiSettingsClient;
    featureId: string;
    ignoreGlobalDefault?: boolean;
    logger: Logger;
}) => Promise<ResolvedConnectorsForFeature>;
