import type { KibanaResponseFactory, RequestHandler, RouteMethod } from '@kbn/core/server';
import type { SecurityRequestHandlerContext } from '../../types';
/**
 * Wraps an OAuth route handler so that requests return a `404 Not Found` when the
 * `agentBuilder:uiamOAuthClientManagement` uiSetting resolves to `false`.
 */
export declare const withOAuthManagementGate: <Params, Query, Body, Context extends SecurityRequestHandlerContext, Method extends RouteMethod, ResponseFactory extends KibanaResponseFactory>(handler: RequestHandler<Params, Query, Body, Context, Method, ResponseFactory>) => RequestHandler<Params, Query, Body, Context, Method, ResponseFactory>;
