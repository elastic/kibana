import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ChatCompleteOptions, AnonymizationRule, Model } from '@kbn/inference-common';
import { type ChatCompleteCompositeResponse } from '@kbn/inference-common';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { InferenceCallbackManager } from '../inference_client/callback_manager';
import type { RegexWorkerService } from './anonymization/regex_worker_service';
import type { InferenceAnonymizationOptions } from '../inference_client/anonymization_options';
import type { InferenceEndpointIdCache } from '../util/inference_endpoint_id_cache';
interface CreateChatCompleteApiOptions {
    request: KibanaRequest;
    namespace: string;
    actions: ActionsPluginStart;
    logger: Logger;
    anonymizationRulesPromise: Promise<AnonymizationRule[]>;
    regexWorker: RegexWorkerService;
    esClient: ElasticsearchClient;
    anonymization?: InferenceAnonymizationOptions;
    endpointIdCache: InferenceEndpointIdCache;
    callbackManager?: InferenceCallbackManager;
}
type CreateChatCompleteApiOptionsKey = 'abortSignal' | 'stream' | 'retryConfiguration' | 'maxRetries';
type ChatCompleteApiWithCallbackInitOptions = Pick<ChatCompleteOptions, CreateChatCompleteApiOptionsKey> & {
    connectorId: string;
};
export interface ChatCompleteCallbackContext {
    model?: Partial<Model>;
}
export type ChatCompleteApiWithCallbackCallback = (context: ChatCompleteCallbackContext) => Omit<ChatCompleteOptions, CreateChatCompleteApiOptionsKey | 'connectorId'>;
export type ChatCompleteApiWithCallback = (options: ChatCompleteApiWithCallbackInitOptions, callback: ChatCompleteApiWithCallbackCallback) => ChatCompleteCompositeResponse;
export declare function createChatCompleteCallbackApi(options: CreateChatCompleteApiOptions): ChatCompleteApiWithCallback;
export {};
