import type { CoreSetup, CoreStart, HttpFetchOptions } from '@kbn/core/public';
import type { ClientRequestParamsOf, ReturnOf, RouteRepositoryClient } from '@kbn/server-route-repository';
import type { StreamsRouteRepository } from '../../server';
type FetchOptions = Omit<HttpFetchOptions, 'body'> & {
    body?: unknown;
};
export type StreamsRepositoryClientOptions = Omit<FetchOptions, 'query' | 'body' | 'pathname' | 'signal'> & {
    signal: AbortSignal | null;
};
export type StreamsRepositoryClient = RouteRepositoryClient<StreamsRouteRepository, StreamsRepositoryClientOptions>;
export type AutoAbortedStreamsRepositoryClient = RouteRepositoryClient<StreamsRouteRepository, Omit<StreamsRepositoryClientOptions, 'signal'>>;
export type StreamsRepositoryEndpoint = keyof StreamsRouteRepository;
export type APIReturnType<TEndpoint extends StreamsRepositoryEndpoint> = ReturnOf<StreamsRouteRepository, TEndpoint>;
export type StreamsAPIClientRequestParamsOf<TEndpoint extends StreamsRepositoryEndpoint> = ClientRequestParamsOf<StreamsRouteRepository, TEndpoint>;
export declare function createStreamsRepositoryClient(core: CoreStart | CoreSetup): StreamsRepositoryClient;
export {};
