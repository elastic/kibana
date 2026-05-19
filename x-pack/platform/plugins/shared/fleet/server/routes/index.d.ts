import type { FleetAuthzRouter } from '../services/security';
import type { FleetConfigType } from '../config';
export declare function registerRoutes(fleetAuthzRouter: FleetAuthzRouter, config: FleetConfigType, isServerless?: boolean): void;
