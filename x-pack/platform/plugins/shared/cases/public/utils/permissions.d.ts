import type { CasesPermissions } from '../../common';
export declare const isReadOnlyPermissions: (permissions: CasesPermissions) => boolean;
type CasePermission = Exclude<keyof CasesPermissions, 'all'>;
export declare const allCasePermissions: CasePermission[];
export declare const getAllPermissionsExceptFrom: (capToExclude: CasePermission) => CasePermission[];
export {};
