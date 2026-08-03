import type { Role } from '@kbn/security-plugin-types-common';
export interface RolePutPayload {
    role: Role;
    createOnly?: boolean;
}
export interface BulkUpdatePayload {
    rolesUpdate: Role[];
}
export interface BulkUpdateRoleResponse {
    created?: string[];
    updated?: string[];
    errors?: Record<string, {
        type: string;
        reason: string;
    }>;
}
export interface RolesAPIClient {
    getRoles: () => Promise<Role[]>;
    getRole: (roleName: string) => Promise<Role>;
    deleteRole: (roleName: string) => Promise<void>;
    saveRole: (payload: RolePutPayload) => Promise<void>;
    bulkUpdateRoles: (payload: BulkUpdatePayload) => Promise<BulkUpdateRoleResponse>;
}
