import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { KibanaRequest, ElasticsearchClient, Logger } from '@kbn/core/server';
import { type InferenceConnector } from '@kbn/inference-common';
/**
 * Retrieves a connector or inference endpoint given the provided `connectorId`.
 */
export declare const getConnectorById: ({ connectorId, actions, request, esClient, logger, }: {
    actions: ActionsPluginStart;
    request: KibanaRequest;
    connectorId: string;
    esClient: ElasticsearchClient;
    logger: Logger;
}) => Promise<InferenceConnector>;
