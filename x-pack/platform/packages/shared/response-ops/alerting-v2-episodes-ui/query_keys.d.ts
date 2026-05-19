import type { EpisodesFilterState, EpisodesSortState } from './queries/episodes_query';
export declare const queryKeys: {
    all: readonly ["alert-episodes"];
    actionsAll: () => readonly ["alert-episodes", "actions"];
    actions: (episodeIds: string[]) => readonly ["alert-episodes", "actions", ...string[]];
    groupActionsAll: () => readonly ["alert-episodes", "group-actions"];
    groupActions: (groupHashes: string[]) => readonly ["alert-episodes", "group-actions", ...string[]];
    list: (pageSize: number, filterState?: EpisodesFilterState, sortState?: EpisodesSortState, timeRange?: {
        from: string;
        to: string;
    } | null) => readonly ["alert-episodes", "list", number, EpisodesFilterState | undefined, EpisodesSortState | undefined, {
        from: string;
        to: string;
    } | null | undefined];
    episodeEvents: (episodeId: string) => readonly ["alert-episodes", "episode-events", string];
    relatedSameGroupEpisodes: (ruleId: string, groupHash: string, pageSize: number) => readonly ["alert-episodes", "related-episodes-same-group", string, string, number];
    relatedOtherEpisodes: (ruleId: string, pageSize: number, currentGroupKey: string, excludeEpisodeId: string) => readonly ["alert-episodes", "related-episodes-other", string, number, string, string];
    episodeEventData: (episodeId: string) => readonly ["alert-episodes", "episode-event-data", string];
    relatedEpisodes: (ruleId: string, excludeEpisodeId: string, pageSize: number) => readonly ["alert-episodes", "related-episodes", string, string, number];
    tagOptionsAll: () => readonly ["alert-episodes", "tag-options"];
    tagOptions: (timeRange?: {
        from: string;
        to: string;
    } | null) => readonly ["alert-episodes", "tag-options", {
        from: string;
        to: string;
    } | null | undefined];
    tagSuggestions: () => readonly ["alert-episodes", "tag-suggestions"];
    assigneeSuggestions: (searchTerm: string) => readonly ["alert-episodes", "assignee-suggestions", string];
    bulkGetProfiles: (uids: string[]) => readonly ["alert-episodes", "bulk-get-profiles", ...string[]];
};
