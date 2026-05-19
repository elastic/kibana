export interface GroupActionRow {
    group_hash: string;
    rule_id: string | null;
    last_deactivate_action: string | null;
    last_snooze_action: string | null;
    snooze_expiry: string | null;
    tags: string | string[] | null;
    last_snooze_actor: string | null;
    last_deactivate_actor: string | null;
}
export declare const buildGroupActionsQuery: (groupHashes: string[]) => import("@elastic/esql").ComposerQuery;
