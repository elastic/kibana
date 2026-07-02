import type { KibanaRequest, ElasticsearchClient, Logger, IUiSettingsClient } from '@kbn/core/server';
import type { InferenceConnector } from '@kbn/inference-common';
import type { ActionsClientProvider } from '../types';
export declare const loadDefaultConnector: ({ actions, request, esClient, uiSettingsClient, logger, }: {
    actions: ActionsClientProvider;
    request: KibanaRequest;
    esClient: ElasticsearchClient;
    uiSettingsClient: IUiSettingsClient;
    logger: Logger;
}) => Promise<InferenceConnector | undefined>;
