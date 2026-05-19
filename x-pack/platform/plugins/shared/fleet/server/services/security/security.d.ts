import type { KibanaRequest } from '@kbn/core/server';
import type { FleetAuthz } from '../../../common';
import type { FleetAuthzRouteConfig, FleetRouteRequiredAuthz } from './types';
export declare function checkSecurityEnabled(): boolean;
export declare function checkSuperuser(req: KibanaRequest): boolean;
export declare function getAuthzFromRequest(req: KibanaRequest): Promise<FleetAuthz>;
interface RouteAuthz {
    /** Is route access granted (based on authz) */
    granted: boolean;
    /** Was authorization to the api a result of Fleet (and Integrations) Privileges (as oposed to Package privileges) */
    grantedByFleetPrivileges: boolean;
    /**
     * Set when `grantedByFleetPrivileges` is `false` and `granted` is true, which indicate access was granted
     * via a Package Privileges. Array will hold the list of Package names that are allowed
     */
    scopeDataToPackages: string[] | undefined;
}
/**
 * Calculates Authz information for a Route, including:
 * 1. Is access granted
 * 2. was access granted based on Fleet and/or Integration privileges, and
 * 3. a list of package names for which access was granted (only set if access was granted by package privileges)
 *
 * @param fleetAuthz
 * @param requiredAuthz
 */
export declare const calculateRouteAuthz: (fleetAuthz: FleetAuthz, requiredAuthz: FleetRouteRequiredAuthz | undefined) => RouteAuthz;
/**
 * Utility to determine if a user has the required Fleet Authz based on user privileges
 * and route required authz structure.
 * @param authz
 * @param fleetRequiredAuthz
 * @returns boolean
 */
export declare const doesNotHaveRequiredFleetAuthz: (authz: FleetAuthz, fleetRequiredAuthz: FleetAuthzRouteConfig["fleetAuthz"]) => boolean;
export {};
