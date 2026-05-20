import type { RouteInitialization, SavedObjectsRouteDeps } from '../types';
/**
 * Routes for job saved object management
 */
export declare function savedObjectsRoutes({ router, routeGuard }: RouteInitialization, { getSpaces, resolveMlCapabilities }: SavedObjectsRouteDeps): void;
