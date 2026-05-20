import type { KibanaResponseFactory, RequestHandler, RouteMethod } from '@kbn/core/server';
import type { SecurityRequestHandlerContext } from '../types';
export declare const createLicensedRouteHandler: <P, Q, B, Context extends SecurityRequestHandlerContext, M extends RouteMethod, R extends KibanaResponseFactory>(handler: RequestHandler<P, Q, B, Context, M, R>) => RequestHandler<P, Q, B, Context, M, R>;
