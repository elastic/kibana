import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { RouteInitialization } from '../types';
/**
 * Routes for the data frame analytics
 */
export declare function dataFrameAnalyticsRoutes({ router, mlLicense, routeGuard, getEnabledFeatures }: RouteInitialization, cloud: CloudSetup): void;
