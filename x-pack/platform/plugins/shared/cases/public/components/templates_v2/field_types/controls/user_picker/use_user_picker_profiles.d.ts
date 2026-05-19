import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
interface UseUserPickerProfilesParams {
    suggestedProfiles: UserProfileWithAvatar[];
    missingUids: string[];
}
interface UseUserPickerProfilesResult {
    allKnownProfiles: UserProfileWithAvatar[];
    isLoadingBulk: boolean;
}
export declare const useUserPickerProfiles: ({ suggestedProfiles, missingUids, }: UseUserPickerProfilesParams) => UseUserPickerProfilesResult;
export {};
