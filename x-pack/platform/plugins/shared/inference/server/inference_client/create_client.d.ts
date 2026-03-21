import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { BoundOptions, BoundInferenceClient, InferenceClient, AnonymizationRule, InferenceCallbacks } from '@kbn/inference-common';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { RegexWorkerService } from '../chat_complete/anonymization/regex_worker_service';
import type { InferenceAnonymizationOptions } from './anonymization_options';
import type { InferenceEndpointIdCache } from '../util/inference_endpoint_id_cache';
interface CreateClientOptions {
    request: KibanaRequest;
    namespace?: string;
    actions: ActionsPluginStart;
    logger: Logger;
    anonymizationRulesPromise: Promise<AnonymizationRule[]>;
    regexWorker: RegexWorkerService;
    esClient: ElasticsearchClient;
    replacementsEsClient?: ElasticsearchClient;
    endpointIdCache: InferenceEndpointIdCache;
    callbacks?: InferenceCallbacks;
    anonymization?: InferenceAnonymizationOptions;
}
interface BoundCreateClientOptions extends CreateClientOptions {
    bindTo: BoundOptions;
}
export declare function createClient(options: CreateClientOptions): InferenceClient;
export declare function createClient(options: BoundCreateClientOptions): BoundInferenceClient;
export {};
