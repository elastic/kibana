import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { BoundOptions, BoundInferenceClient, InferenceClient, AnonymizationRule, InferenceCallbacks } from '@kbn/inference-common';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ActionsClientProvider } from '../types';
import type { RegexWorkerService } from '../chat_complete/anonymization/regex_worker_service';
import type { InferenceAnonymizationOptions } from './anonymization_options';
import type { InferenceEndpointIdCache } from '../util/inference_endpoint_id_cache';
import type { TokenUsageLogger } from '../token_usage';
interface CreateClientOptions {
    request: KibanaRequest;
    namespace?: string;
    actions: ActionsClientProvider;
    logger: Logger;
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
interface BoundCreateClientOptions extends CreateClientOptions {
    bindTo: BoundOptions;
}
export declare function createClient(options: CreateClientOptions): InferenceClient;
export declare function createClient(options: BoundCreateClientOptions): BoundInferenceClient;
interface CreateClientWithoutRequestOptions {
    actionsClient: PublicMethodsOf<ActionsClient>;
    logger: Logger;
    regexWorker: RegexWorkerService;
    esClient: ElasticsearchClient;
    endpointIdCache: InferenceEndpointIdCache;
}
/**
 * Creates an inference client using pre-scoped services instead of a KibanaRequest.
 * Useful for background tasks (e.g. alerting rule executors) that have scoped clients
 * but no HTTP request context.
 *
 * Internally wraps the actionsClient in an actions-like object so that the underlying
 * createInferenceClient can resolve connectors. Anonymization is not available.
 */
export declare const createClientWithoutRequest: ({ actionsClient, logger, regexWorker, esClient, endpointIdCache, }: CreateClientWithoutRequestOptions) => InferenceClient;
export {};
