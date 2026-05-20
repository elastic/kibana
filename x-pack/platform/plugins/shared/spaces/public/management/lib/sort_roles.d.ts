import type { Role } from '@kbn/security-plugin-types-common';
/**
 * Roles in the listing must be sorted so that custom roles appear in the beginning
 * and reserved roles appear at the end
 */
export declare function sortRolesForListing(aRole: Role, bRole: Role): number;
