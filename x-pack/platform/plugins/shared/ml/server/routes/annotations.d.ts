import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import type { RouteInitialization } from '../types';
/**
 * Routes for annotations
 */
export declare function annotationRoutes({ router, routeGuard }: RouteInitialization, securityPlugin?: SecurityPluginSetup): void;
