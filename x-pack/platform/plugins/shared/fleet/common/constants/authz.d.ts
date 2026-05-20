export declare const SECURITY_SOLUTION_APP_ID = "siemV5";
export interface PrivilegeMapObject {
    appId: string;
    privilegeSplit: string;
    privilegeType: 'ui' | 'api';
    privilegeName: string;
}
/**
 * defines endpoint package privileges
 * the key is the name of the packagePrivilege (ie. 'readSecuritySolution')
 * the value object is for mapping kibana privileges and capabilities
 * see x-pack/platform/plugins/shared/fleet/server/services/security/security.ts for example of how object values are used
 */
export declare const ENDPOINT_PRIVILEGES: Record<string, PrivilegeMapObject>;
export declare const ENDPOINT_EXCEPTIONS_PRIVILEGES: Record<string, PrivilegeMapObject>;
