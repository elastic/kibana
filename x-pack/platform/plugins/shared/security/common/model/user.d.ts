import type { User } from '@kbn/security-plugin-types-common';
export interface EditUser extends User {
    password?: string;
    confirmPassword?: string;
}
/**
 * Set of available name-related fields to pick as display name.
 */
export interface GetUserDisplayNameParams {
    /**
     * Username of the user.
     */
    username: string;
    /**
     * Optional email of the user.
     */
    email?: string;
    /**
     * Optional full name of the user.
     */
    full_name?: string;
}
/**
 * Determines the display name for the provided user information.
 * @param params Set of available user's name-related fields.
 */
export declare function getUserDisplayName(params: GetUserDisplayNameParams): string;
