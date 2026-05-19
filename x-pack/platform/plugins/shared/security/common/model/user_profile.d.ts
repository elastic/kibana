import type { AuthenticatedUser, UserProfileData, UserProfileUserInfo, UserProfileWithSecurity } from '@kbn/security-plugin-types-common';
import type { UserProfileAvatarData } from '@kbn/user-profile-components';
/**
 * User profile enriched with session information.
 */
export interface GetUserProfileResponse<D extends UserProfileData = UserProfileData> extends UserProfileWithSecurity<D> {
    /**
     * Information about the currently authenticated user that owns the profile.
     */
    user: UserProfileWithSecurity['user'] & Pick<AuthenticatedUser, 'authentication_provider'>;
}
export declare const USER_AVATAR_FALLBACK_CODE_POINT = 97;
export declare const USER_AVATAR_MAX_INITIALS = 2;
/**
 * Determines the color for the provided user profile.
 * If a color is present on the user profile itself, then that is used.
 * Otherwise, a color is provided from EUI's Visualization Colors based on the display name.
 *
 * @param {UserProfileUserInfo} user User info
 * @param {UserProfileAvatarData} avatar User avatar
 */
export declare function getUserAvatarColor(user: Pick<UserProfileUserInfo, 'username' | 'full_name'>, avatar?: UserProfileAvatarData): string;
/**
 * Determines the initials for the provided user profile.
 * If initials are present on the user profile itself, then that is used.
 * Otherwise, the initials are calculated based off the words in the display name, with a max length of 2 characters.
 *
 * @param {UserProfileUserInfo} user User info
 * @param {UserProfileAvatarData} avatar User avatar
 */
export declare function getUserAvatarInitials(user: Pick<UserProfileUserInfo, 'username' | 'full_name'>, avatar?: UserProfileAvatarData): string;
