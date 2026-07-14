import type { DeprecationsDetails, GetDeprecationsContext } from '@kbn/core/server';
import type { Role } from '@kbn/security-plugin-types-common';
export interface PrivilegeDeprecationsRolesByFeatureIdResponse {
    roles?: Role[];
    errors?: DeprecationsDetails[];
}
export interface PrivilegeDeprecationsRolesByFeatureIdRequest {
    context: GetDeprecationsContext;
    featureId: string;
}
export interface PrivilegeDeprecationsService {
    getKibanaRolesByFeatureId: (args: PrivilegeDeprecationsRolesByFeatureIdRequest) => Promise<PrivilegeDeprecationsRolesByFeatureIdResponse>;
}
