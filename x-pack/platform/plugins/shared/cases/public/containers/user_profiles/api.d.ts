import type { HttpStart } from '@kbn/core/public';
import type { UserProfile } from '@kbn/security-plugin/common';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
export interface SuggestUserProfilesArgs {
    http: HttpStart;
    name: string;
    owners: string[];
    signal?: AbortSignal;
    size?: number;
}
export declare const suggestUserProfiles: ({ http, name, size, owners, signal, }: SuggestUserProfilesArgs) => Promise<UserProfile[]>;
export interface BulkGetUserProfilesArgs {
    security: SecurityPluginStart;
    uids: string[];
}
export declare const bulkGetUserProfiles: ({ security, uids, }: BulkGetUserProfilesArgs) => Promise<UserProfile[]>;
export interface GetCurrentUserProfileArgs {
    security: SecurityPluginStart;
}
export declare const getCurrentUserProfile: ({ security, }: GetCurrentUserProfileArgs) => Promise<UserProfile>;
