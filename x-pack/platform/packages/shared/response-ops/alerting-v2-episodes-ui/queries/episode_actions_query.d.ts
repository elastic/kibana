export interface AlertEpisodeAction {
    episode_id: string;
    rule_id: string | null;
    group_hash: string | null;
    last_ack_action: string | null;
    last_assignee_uid: string | null;
    last_ack_actor: string | null;
}
export declare const buildEpisodeActionsQuery: (episodeIds: string[]) => import("@elastic/esql").ComposerQuery;
