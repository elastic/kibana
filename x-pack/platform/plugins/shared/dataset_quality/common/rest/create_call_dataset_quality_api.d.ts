import type { CoreSetup, CoreStart } from '@kbn/core/public';
import type { ClientRequestParamsOf, ReturnOf, RouteRepositoryClient } from '@kbn/server-route-repository';
import type { FetchOptions } from '..';
import type { APIEndpoint, DatasetQualityServerRouteRepository } from '../../server/routes';
export type DatasetQualityClientOptions = Omit<FetchOptions, 'query' | 'body' | 'pathname' | 'signal'> & {
    signal: AbortSignal | null;
};
export type DatasetQualityClient = RouteRepositoryClient<DatasetQualityServerRouteRepository, DatasetQualityClientOptions>['fetch'];
export type AutoAbortedClient = RouteRepositoryClient<DatasetQualityServerRouteRepository, Omit<DatasetQualityClientOptions, 'signal'>>['fetch'];
export type APIReturnType<TEndpoint extends APIEndpoint> = ReturnOf<DatasetQualityServerRouteRepository, TEndpoint>;
export type APIClientRequestParamsOf<TEndpoint extends APIEndpoint> = ClientRequestParamsOf<DatasetQualityServerRouteRepository, TEndpoint>;
export declare let callDatasetQualityApi: DatasetQualityClient;
export declare function createCallDatasetQualityApi(core: CoreStart | CoreSetup): void;
