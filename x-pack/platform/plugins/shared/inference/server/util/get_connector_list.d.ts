import type { KibanaRequest, ElasticsearchClient, Logger } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { InferenceConnector } from '@kbn/inference-common';
export declare const getConnectorList: ({ actions, request, esClient, logger, }: {
    actions: ActionsPluginStart;
    request: KibanaRequest;
    esClient: ElasticsearchClient;
    logger: Logger;
}) => Promise<InferenceConnector[]>;
