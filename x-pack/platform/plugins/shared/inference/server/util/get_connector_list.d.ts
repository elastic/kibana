import type { KibanaRequest, ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { InferenceConnector } from '@kbn/inference-common';
import type { ActionsClientProvider } from '../types';
interface GetConnectorListWithRequestOptions {
    actions: ActionsClientProvider;
    request: KibanaRequest;
    esClient: ElasticsearchClient;
    logger: Logger;
}
interface GetConnectorListWithActionsClientOptions {
    actionsClient: PublicMethodsOf<ActionsClient>;
    esClient: ElasticsearchClient;
    logger: Logger;
}
type GetConnectorListOptions = GetConnectorListWithRequestOptions | GetConnectorListWithActionsClientOptions;
export declare const getConnectorList: (options: GetConnectorListOptions) => Promise<InferenceConnector[]>;
export {};
