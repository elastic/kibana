import type { UserProfileMap } from '../hooks/use_bulk_get_user_profiles';
export declare const NO_USER_PLACEHOLDER = "-";
export declare const resolveDisplayName: (uid: string | null | undefined, profiles: UserProfileMap | undefined, placeholder?: string) => string;
