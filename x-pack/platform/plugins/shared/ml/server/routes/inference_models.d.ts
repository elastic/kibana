import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { RouteInitialization } from '../types';
export declare function inferenceModelRoutes({ router, routeGuard, getEnabledFeatures }: RouteInitialization, cloud: CloudSetup): void;
