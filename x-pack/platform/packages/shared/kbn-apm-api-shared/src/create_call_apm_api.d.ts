import type { CoreStart, HttpFetchOptions } from '@kbn/core/public';
import type { ICPSManager } from '@kbn/cps-utils';
import { type RouteRepositoryClient } from '@kbn/server-route-repository';
import type { EndpointOf, ReturnOf } from '@kbn/server-route-repository-utils';
import type { SharedAPMRouteRepository } from './routes';
export type FetchOptions = Omit<HttpFetchOptions, 'body'> & {
    pathname: string;
    isCachable?: boolean;
    method?: string;
    body?: any;
};
type APMClientOptions = Omit<FetchOptions, 'query' | 'body' | 'pathname' | 'signal'> & {
    signal: AbortSignal | null;
};
export type APMClientV2 = RouteRepositoryClient<SharedAPMRouteRepository, APMClientOptions>['fetch'];
export type AutoAbortedAPMClientV2 = RouteRepositoryClient<SharedAPMRouteRepository, Omit<APMClientOptions, 'signal'>>['fetch'];
type APIEndpoint = EndpointOf<SharedAPMRouteRepository>;
export type APIReturnType<TEndpoint extends APIEndpoint> = ReturnOf<SharedAPMRouteRepository, TEndpoint>;
interface Dependencies {
    cpsManager?: ICPSManager;
}
export declare function createCallApmApiV2(core: CoreStart, { cpsManager }: Dependencies): APMClientV2;
export {};
