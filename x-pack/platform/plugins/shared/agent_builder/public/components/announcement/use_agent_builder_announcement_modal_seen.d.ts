import type { UserProfileServiceStart } from '@kbn/core-user-profile-browser';
/**
 * Returns whether the announcement was dismissed for the current user (all spaces).
 * When user profiles are disabled, returns true so the modal is not shown (dismissal cannot persist).
 */
export declare function getAnnouncementModalSeen(userProfile: UserProfileServiceStart): Promise<boolean>;
/**
 * Persists global dismissal in user profile data.
 * No-ops when user profiles are disabled.
 */
export declare function setAnnouncementModalSeen(userProfile: UserProfileServiceStart): Promise<void>;
export interface UseAgentBuilderAnnouncementModalSeenStateResult {
    isSeen: boolean;
    isReady: boolean;
    markSeen: () => Promise<void>;
}
export declare function useAgentBuilderAnnouncementModalSeenState(userProfile: UserProfileServiceStart): UseAgentBuilderAnnouncementModalSeenStateResult;
