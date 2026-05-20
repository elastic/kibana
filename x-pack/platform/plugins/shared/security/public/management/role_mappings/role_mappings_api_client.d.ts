import type { HttpStart } from '@kbn/core/public';
import type { RoleMapping } from '../../../common';
type DeleteRoleMappingsResponse = Array<{
    name: string;
    success: boolean;
    error?: Error;
}>;
export declare class RoleMappingsAPIClient {
    private readonly http;
    constructor(http: HttpStart);
    getRoleMappings(): Promise<RoleMapping[]>;
    getRoleMapping(name: string): Promise<RoleMapping>;
    saveRoleMapping(roleMapping: RoleMapping): Promise<unknown>;
    deleteRoleMappings(names: string[]): Promise<DeleteRoleMappingsResponse>;
}
export {};
