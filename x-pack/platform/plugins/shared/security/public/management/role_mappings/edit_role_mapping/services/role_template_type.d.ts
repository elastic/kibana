import type { InlineRoleTemplate, InvalidRoleTemplate, RoleTemplate, StoredRoleTemplate } from '../../../../../common';
export declare function isStoredRoleTemplate(roleMappingTemplate: RoleTemplate): roleMappingTemplate is StoredRoleTemplate;
export declare function isInlineRoleTemplate(roleMappingTemplate: RoleTemplate): roleMappingTemplate is InlineRoleTemplate;
export declare function isInvalidRoleTemplate(roleMappingTemplate: RoleTemplate): roleMappingTemplate is InvalidRoleTemplate;
