import type { RouteInitialization, SystemRouteDeps } from '../types';
/**
 * System routes
 */
export declare function systemRoutes({ router, mlLicense, routeGuard }: RouteInitialization, { getSpaces, cloud, resolveMlCapabilities, serverless }: SystemRouteDeps): void;
