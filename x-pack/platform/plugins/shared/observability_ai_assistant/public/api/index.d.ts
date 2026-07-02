import type { CoreSetup, CoreStart, HttpFetchOptions } from '@kbn/core/public';
import type { ClientRequestParamsOf, ReturnOf, RouteRepositoryClient } from '@kbn/server-route-repository';
import type { ObservabilityAIAssistantServerRouteRepository } from '../../server';
type FetchOptions = Omit<HttpFetchOptions, 'body'> & {
    body?: any;
};
export type ObservabilityAIAssistantAPIClientOptions = Omit<FetchOptions, 'query' | 'body' | 'pathname' | 'signal'> & {
    signal: AbortSignal | null;
};
export type ObservabilityAIAssistantAPIClient = RouteRepositoryClient<ObservabilityAIAssistantServerRouteRepository, ObservabilityAIAssistantAPIClientOptions>['fetch'];
export type AutoAbortedObservabilityAIAssistantAPIClient = RouteRepositoryClient<ObservabilityAIAssistantServerRouteRepository, Omit<ObservabilityAIAssistantAPIClientOptions, 'signal'>>['fetch'];
export type ObservabilityAIAssistantAPIEndpoint = keyof ObservabilityAIAssistantServerRouteRepository;
export type APIReturnType<TEndpoint extends ObservabilityAIAssistantAPIEndpoint> = ReturnOf<ObservabilityAIAssistantServerRouteRepository, TEndpoint>;
export type ObservabilityAIAssistantAPIClientRequestParamsOf<TEndpoint extends ObservabilityAIAssistantAPIEndpoint> = ClientRequestParamsOf<ObservabilityAIAssistantServerRouteRepository, TEndpoint>;
export declare function createCallObservabilityAIAssistantAPI(core: CoreStart | CoreSetup): ObservabilityAIAssistantAPIClient;
export {};
