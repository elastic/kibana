import { type IRouter, type KibanaResponseFactory, type Logger, type RequestHandler, type RouteMethod } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import type { FleetRequestHandlerContext } from '../..';
import type { FleetAuthzRouter } from './types';
export declare const DEFAULT_FLEET_ROUTE_SECURITY: RouteSecurity;
export declare function withDefaultErrorHandler<TContext extends FleetRequestHandlerContext, R extends RouteMethod>(wrappedHandler: RequestHandler<any, any, any, TContext, R, KibanaResponseFactory>): RequestHandler<any, any, any, TContext, R, KibanaResponseFactory>;
export declare function makeRouterWithFleetAuthz<TContext extends FleetRequestHandlerContext>(router: IRouter<TContext>, logger: Logger): FleetAuthzRouter<TContext>;
