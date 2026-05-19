import type { RouteMethod } from '@kbn/core-http-server';
import type { FleetRouteRequiredAuthz } from './types';
/**
 * Retrieves the required fleet route authz
 * in order to grant access to the given api route
 * @param routeMethod
 * @param routePath
 */
export declare const getRouteRequiredAuthz: (routeMethod: RouteMethod, routePath: string) => FleetRouteRequiredAuthz | undefined;
