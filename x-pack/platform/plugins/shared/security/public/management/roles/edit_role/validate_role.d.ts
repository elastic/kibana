import type { BuildFlavor } from '@kbn/config';
import type { Role, RoleIndexPrivilege, RoleRemoteClusterPrivilege, RoleRemoteIndexPrivilege } from '../../../../common';
interface RoleValidatorOptions {
    shouldValidate?: boolean;
    buildFlavor?: BuildFlavor;
}
export interface RoleValidationResult {
    isInvalid: boolean;
    error?: string;
}
export declare class RoleValidator {
    private shouldValidate?;
    private buildFlavor?;
    constructor(options?: RoleValidatorOptions);
    enableValidation(): void;
    disableValidation(): void;
    validateRoleName(role: Role): RoleValidationResult;
    validateRemoteClusterPrivileges(role: Role): RoleValidationResult;
    validateIndexPrivileges(role: Role): RoleValidationResult;
    validateRemoteIndexPrivileges(role: Role): RoleValidationResult;
    validateRemoteIndexPrivilegeClustersField(indexPrivilege: RoleRemoteIndexPrivilege): RoleValidationResult;
    validateIndexPrivilegeNamesField(indexPrivilege: RoleIndexPrivilege | RoleRemoteIndexPrivilege): RoleValidationResult;
    validateIndexPrivilegePrivilegesField(indexPrivilege: RoleIndexPrivilege | RoleRemoteIndexPrivilege): RoleValidationResult;
    validateRemoteClusterPrivilegeClusterField(remoteClusterPrivilege: RoleRemoteClusterPrivilege): RoleValidationResult;
    validateRemoteClusterPrivilegePrivilegesField(remoteClusterPrivilege: RoleRemoteClusterPrivilege): RoleValidationResult;
    validateSelectedSpaces(spaceIds: string[], privilege: string | null): RoleValidationResult;
    validateSelectedPrivilege(spaceIds: string[], privilege: string | null): RoleValidationResult;
    validateSpacePrivileges(role: Role): RoleValidationResult;
    validateForSave(role: Role): RoleValidationResult;
}
export {};
