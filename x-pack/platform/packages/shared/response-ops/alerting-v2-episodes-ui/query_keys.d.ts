import type { EpisodesFilterState, EpisodesSortState } from './queries/episodes_query';
export declare const queryKeys: {
    all: readonly ["alert-episodes"];
    actionsAll: () => readonly ["alert-episodes", "actions"];
    actions: (spaceId: string, episodeIds: string[]) => readonly ["alert-episodes", "actions", string, ...string[]];
    groupActionsAll: () => readonly ["alert-episodes", "group-actions"];
    groupActions: (spaceId: string, groupHashes: string[]) => readonly ["alert-episodes", "group-actions", string, ...string[]];
    listAll: () => readonly ["alert-episodes", "list"];
    list: (spaceId: string, pageSize: number, filterState?: EpisodesFilterState, sortState?: EpisodesSortState, timeRange?: {
        from: string;
        to: string;
    } | null) => readonly ["alert-episodes", "list", string, number, EpisodesFilterState | undefined, EpisodesSortState | undefined, {
        from: string;
        to: string;
    } | null | undefined];
    episodeEventsAll: () => readonly ["alert-episodes", "episode-events"];
    episodeEvents: (spaceId: string, episodeId: string) => readonly ["alert-episodes", "episode-events", string, string];
    relatedSameGroupEpisodes: (spaceId: string, ruleId: string, groupHash: string, pageSize: number) => readonly ["alert-episodes", "related-episodes-same-group", string, string, string, number];
    relatedOtherEpisodes: (spaceId: string, ruleId: string, pageSize: number, currentGroupKey: string, excludeEpisodeId: string) => readonly ["alert-episodes", "related-episodes-other", string, string, number, string, string];
    episodeEventDataAll: () => readonly ["alert-episodes", "episode-event-data"];
    episodeEventData: (spaceId: string, episodeId: string) => readonly ["alert-episodes", "episode-event-data", string, string];
    tagOptionsAll: () => readonly ["alert-episodes", "tag-options"];
    tagOptions: (spaceId: string, timeRange?: {
        from: string;
        to: string;
    } | null) => readonly ["alert-episodes", "tag-options", string, {
        from: string;
        to: string;
    } | null | undefined];
    tagSuggestionsAll: () => readonly ["alert-episodes", "tag-suggestions"];
    tagSuggestions: (spaceId: string) => readonly ["alert-episodes", "tag-suggestions", string];
    assigneeSuggestions: (searchTerm: string) => readonly ["alert-episodes", "assignee-suggestions", string];
    bulkGetProfiles: (uids: string[]) => readonly ["alert-episodes", "bulk-get-profiles", ...string[]];
};
