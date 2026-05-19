export interface User {
    email: string | null | undefined;
    full_name: string | null | undefined;
    username: string | null | undefined;
    profile_uid?: string;
}
export interface UserProfile {
    uid: string;
}
