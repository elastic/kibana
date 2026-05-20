import type { Criteria } from '@elastic/eui';
import type { HttpStart } from '@kbn/core/public';
import type { QueryRolesResult } from '@kbn/security-plugin-types-common';
import type { BulkUpdatePayload, BulkUpdateRoleResponse } from '@kbn/security-plugin-types-public';
import type { Role } from '../../../common';
export interface QueryRoleParams {
    query: string;
    from: number;
    size: number;
    filters?: {
        showReservedRoles?: boolean;
    };
    sort: Criteria<Role>['sort'];
}
export declare class RolesAPIClient {
    private readonly http;
    constructor(http: HttpStart);
    getRoles: () => Promise<Role[]>;
    queryRoles: (params?: QueryRoleParams) => Promise<QueryRolesResult>;
    getRole: (roleName: string) => Promise<Role>;
    deleteRole: (roleName: string) => Promise<void>;
    saveRole: ({ role, createOnly }: {
        role: Role;
        createOnly?: boolean;
    }) => Promise<void>;
    bulkUpdateRoles: ({ rolesUpdate, }: BulkUpdatePayload) => Promise<BulkUpdateRoleResponse>;
    private transformRoleForSave;
}
