import type { Role } from '@kbn/security-plugin-types-common';
/**
 * Returns whether given role is enabled or not
 *
 * @param role Object Role JSON, as returned by roles API
 * @return Boolean true if role is enabled; false otherwise
 */
export declare function isRoleEnabled(role: Partial<Role>): any;
/**
 * Returns whether given role is reserved or not.
 *
 * @param role Role as returned by roles API
 */
export declare function isRoleReserved(role: Partial<Role>): boolean;
/**
 * Returns whether given role is deprecated or not.
 *
 * @param {role} the Role as returned by roles API
 */
export declare function isRoleDeprecated(role: Partial<Role>): boolean;
/**
 * Returns whether given role is a system role or not.
 *
 * @param {role} the Role as returned by roles API
 */
export declare function isRoleSystem(role: Partial<Role>): boolean;
/**
 * Returns whether given role is an admin role or not.
 *
 * @param {role} the Role as returned by roles API
 */
export declare function isRoleAdmin(role: Partial<Role>): boolean;
/**
 * Returns the extended deprecation notice for the provided role.
 *
 * @param role the Role as returned by roles API
 */
export declare function getExtendedRoleDeprecationNotice(role: Partial<Role>): string;
/**
 * Returns whether given role is editable through the UI or not.
 *
 * @param role the Role as returned by roles API
 */
export declare function isRoleWithWildcardBasePrivilege(role: Partial<Role>): boolean;
/**
 * Returns whether given role is editable through the UI or not.
 *
 * @param role the Role as returned by roles API
 */
export declare function isRoleReadOnly(role: Partial<Role>): boolean;
/**
 * Returns a deep copy of the role.
 *
 * @param role the Role to copy.
 */
export declare function copyRole(role: Role): Role;
/**
 * Creates a deep copy of the role suitable for cloning.
 *
 * @param role the Role to clone.
 */
export declare function prepareRoleClone(role: Role): Role;
