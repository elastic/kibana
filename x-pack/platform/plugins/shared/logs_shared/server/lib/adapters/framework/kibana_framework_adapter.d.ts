import type { CoreSetup, IRouter, RouteMethod } from '@kbn/core/server';
import type { LogsSharedPluginRequestHandlerContext, LogsSharedServerPluginSetupDeps, LogsSharedServerPluginStartDeps } from '../../../types';
import type { CallWithRequestParams, LogsSharedDatabaseGetIndicesAliasResponse, LogsSharedDatabaseGetIndicesResponse, LogsSharedDatabaseMultiResponse, LogsSharedDatabaseSearchResponse, LogsSharedVersionedRouteConfig } from './adapter_types';
export declare class KibanaFramework {
    router: IRouter;
    plugins: LogsSharedServerPluginSetupDeps;
    constructor(core: CoreSetup<LogsSharedServerPluginStartDeps>, plugins: LogsSharedServerPluginSetupDeps);
    registerVersionedRoute<Method extends RouteMethod = any>(config: LogsSharedVersionedRouteConfig<Method>): import("@kbn/core/packages/http/server").VersionedRoute<"get", import("@kbn/core/server").RequestHandlerContext>;
    callWithRequest<Hit = {}, Aggregation = undefined>(requestContext: LogsSharedPluginRequestHandlerContext, endpoint: 'search', options?: CallWithRequestParams): Promise<LogsSharedDatabaseSearchResponse<Hit, Aggregation>>;
    callWithRequest<Hit = {}, Aggregation = undefined>(requestContext: LogsSharedPluginRequestHandlerContext, endpoint: 'msearch', options?: CallWithRequestParams): Promise<LogsSharedDatabaseMultiResponse<Hit, Aggregation>>;
    callWithRequest(requestContext: LogsSharedPluginRequestHandlerContext, endpoint: 'indices.existsAlias', options?: CallWithRequestParams): Promise<boolean>;
    callWithRequest(requestContext: LogsSharedPluginRequestHandlerContext, method: 'indices.getAlias', options?: object): Promise<LogsSharedDatabaseGetIndicesAliasResponse>;
    callWithRequest(requestContext: LogsSharedPluginRequestHandlerContext, method: 'indices.get' | 'ml.getBuckets', options?: object): Promise<LogsSharedDatabaseGetIndicesResponse>;
    callWithRequest(requestContext: LogsSharedPluginRequestHandlerContext, method: 'transport.request', options?: CallWithRequestParams): Promise<unknown>;
    callWithRequest(requestContext: LogsSharedPluginRequestHandlerContext, endpoint: string, options?: CallWithRequestParams): Promise<LogsSharedDatabaseSearchResponse>;
}
