import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { InferenceChatModel, type InferenceChatModelParams } from '@kbn/inference-langchain';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { AnonymizationRule, InferenceCallbacks } from '@kbn/inference-common';
import type { RegexWorkerService } from '../chat_complete/anonymization/regex_worker_service';
import type { InferenceAnonymizationOptions } from './anonymization_options';
import type { InferenceEndpointIdCache } from '../util/inference_endpoint_id_cache';
export interface CreateChatModelOptions {
    request: KibanaRequest;
    connectorId: string;
    actions: ActionsPluginStart;
    logger: Logger;
    chatModelOptions: Omit<InferenceChatModelParams, 'connector' | 'chatComplete' | 'logger'>;
    anonymizationRulesPromise: Promise<AnonymizationRule[]>;
    regexWorker: RegexWorkerService;
    esClient: ElasticsearchClient;
    replacementsEsClient?: ElasticsearchClient;
    endpointIdCache: InferenceEndpointIdCache;
    callbacks?: InferenceCallbacks;
    anonymization?: InferenceAnonymizationOptions;
}
export declare const createChatModel: ({ request, connectorId, actions, logger, chatModelOptions, anonymizationRulesPromise, regexWorker, esClient, replacementsEsClient, endpointIdCache, callbacks, anonymization, }: CreateChatModelOptions) => Promise<InferenceChatModel>;
