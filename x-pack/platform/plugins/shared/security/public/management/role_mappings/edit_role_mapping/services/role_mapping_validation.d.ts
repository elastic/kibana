import type { RoleMapping } from '../../../../../common';
interface ValidationResult {
    isInvalid: boolean;
    error?: string;
}
export declare function validateRoleMappingName({ name }: RoleMapping): ValidationResult;
export declare function validateRoleMappingRoles({ roles }: RoleMapping): ValidationResult;
export declare function validateRoleMappingRoleTemplates({ role_templates: roleTemplates, }: RoleMapping): ValidationResult;
export declare function validateRoleMappingRules({ rules }: Pick<RoleMapping, 'rules'>): ValidationResult;
export declare function validateRoleMappingForSave(roleMapping: RoleMapping): ValidationResult;
export {};
