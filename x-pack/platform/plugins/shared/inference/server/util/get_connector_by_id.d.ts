import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { KibanaRequest, ElasticsearchClient, Logger } from '@kbn/core/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { type InferenceConnector } from '@kbn/inference-common';
import type { ActionsClientProvider } from '../types';
/**
 * Retrieves a connector or inference endpoint given the provided `connectorId`.
 *
 * If the `connectorId` matches a preconfigured `.inference` stack connector that has been
 * superseded by its underlying inference endpoint (i.e. `getConnectorList` prefers the
 * endpoint representation), the corresponding inference endpoint is returned instead.
 */
export declare const getConnectorById: ({ connectorId, actions, request, esClient, logger, }: {
    actions: ActionsClientProvider;
    request: KibanaRequest;
    connectorId: string;
    esClient: ElasticsearchClient;
    logger: Logger;
}) => Promise<InferenceConnector>;
/**
 * Retrieves a connector or inference endpoint given the provided `connectorId`,
 * using pre-scoped `actionsClient` and `esClient` instead of a {@link KibanaRequest}.
 *
 * This is useful for background tasks (e.g. alerting rule executors) that already
 * have scoped clients but no HTTP request context.
 */
export declare const getConnectorByIdWithoutClientRequest: ({ connectorId, actionsClient, esClient, logger, }: {
    connectorId: string;
    actionsClient: PublicMethodsOf<ActionsClient>;
    esClient: ElasticsearchClient;
    logger: Logger;
}) => Promise<InferenceConnector>;
