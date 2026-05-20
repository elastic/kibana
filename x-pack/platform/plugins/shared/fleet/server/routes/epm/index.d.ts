import type { RouteSecurity } from '@kbn/core-http-server';
import { type FleetAuthzRouter } from '../../services/security';
import type { FleetAuthzRouteConfig } from '../../services/security/types';
import type { FleetConfigType } from '../../config';
export declare const INSTALL_PACKAGES_AUTHZ: FleetAuthzRouteConfig['fleetAuthz'];
export declare const INSTALL_PACKAGES_SECURITY: RouteSecurity;
export declare const READ_PACKAGE_INFO_AUTHZ: FleetAuthzRouteConfig['fleetAuthz'];
export declare const READ_PACKAGE_INFO_SECURITY: RouteSecurity;
export declare const registerRoutes: (router: FleetAuthzRouter, config: FleetConfigType) => void;
