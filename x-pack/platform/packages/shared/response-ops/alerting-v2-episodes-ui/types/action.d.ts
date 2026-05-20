export interface EpisodeActionState {
    episodeId: string;
    ruleId: string | null;
    groupHash: string | null;
    lastAckAction: string | null;
    lastAssigneeUid: string | null;
    lastAckActor: string | null;
}
export interface AlertEpisodeGroupAction {
    groupHash: string;
    ruleId: string | null;
    lastDeactivateAction: string | null;
    lastSnoozeAction: string | null;
    snoozeExpiry: string | null;
    tags: string[];
    lastSnoozeActor: string | null;
    lastDeactivateActor: string | null;
}
