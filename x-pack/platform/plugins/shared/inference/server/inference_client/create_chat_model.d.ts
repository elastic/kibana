import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import { InferenceChatModel, type InferenceChatModelParams } from '@kbn/inference-langchain';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { AnonymizationRule, InferenceCallbacks } from '@kbn/inference-common';
import type { ActionsClientProvider } from '../types';
import type { RegexWorkerService } from '../chat_complete/anonymization/regex_worker_service';
import type { InferenceAnonymizationOptions } from './anonymization_options';
import type { InferenceEndpointIdCache } from '../util/inference_endpoint_id_cache';
import type { TokenUsageLogger } from '../token_usage';
export interface CreateChatModelOptions {
    request: KibanaRequest;
    connectorId: string;
    actions: ActionsClientProvider;
    logger: Logger;
    chatModelOptions: Omit<InferenceChatModelParams, 'connector' | 'chatComplete' | 'logger'>;
    anonymizationRulesPromise: Promise<AnonymizationRule[]>;
    regexWorker: RegexWorkerService;
    esClient: ElasticsearchClient;
    replacementsEsClient?: ElasticsearchClient;
    endpointIdCache: InferenceEndpointIdCache;
    callbacks?: InferenceCallbacks;
    anonymization?: InferenceAnonymizationOptions;
    tokenUsageLogger?: TokenUsageLogger;
    isTokenUsageTrackingEnabled?: () => Promise<boolean>;
}
export declare const createChatModel: ({ request, connectorId, actions, logger, chatModelOptions, anonymizationRulesPromise, regexWorker, esClient, replacementsEsClient, endpointIdCache, callbacks, anonymization, tokenUsageLogger, isTokenUsageTrackingEnabled, }: CreateChatModelOptions) => Promise<InferenceChatModel>;
