import type { CaseUI } from '../../../../../../../common';
/**
 * Participants and user profiles parsed out of the case users response, for
 * the "Attributes" sidebar section. Other cases-level data (permissions,
 * connectors, configuration, etc.) should be read from their own hooks where
 * they're actually needed instead of being funnelled through here.
 */
export declare const useCaseParticipantsData: ({ caseData }: {
    caseData: CaseUI;
}) => {
    isLoadingCaseUsers: boolean;
    userProfiles: Map<string, import("@kbn/user-profile-components").UserProfileWithAvatar>;
    participants: ({
        user: {
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        };
    } & {
        uid?: string | undefined;
    } & {
        avatar?: {
            initials?: string | null | undefined;
            color?: string | null | undefined;
            imageUrl?: string | null | undefined;
        } | undefined;
    })[] | undefined;
};
