import type { TimeRange } from '@kbn/es-query';
import type { EpisodesFilterState, EpisodesSortState } from './queries/episodes_query';
export declare const queryKeys: {
    all: readonly ["alert-episodes"];
    actionsAll: () => readonly ["alert-episodes", "actions"];
    actions: (spaceId: string, episodeIds: string[]) => readonly ["alert-episodes", "actions", string, ...string[]];
    groupActionsAll: () => readonly ["alert-episodes", "group-actions"];
    groupActions: (spaceId: string, groupHashes: string[]) => readonly ["alert-episodes", "group-actions", string, ...string[]];
    actionsHistoryAll: () => readonly ["alert-episodes", "actions-history"];
    actionsHistory: (spaceId: string, episodeId: string, groupHash: string) => readonly ["alert-episodes", "actions-history", string, string, string];
    listAll: () => readonly ["alert-episodes", "list"];
    list: (spaceId: string, pageSize: number, filterState?: EpisodesFilterState, sortState?: EpisodesSortState, timeRange?: {
        from: string;
        to: string;
    } | null) => readonly ["alert-episodes", "list", string, number, EpisodesFilterState | undefined, EpisodesSortState | undefined, {
        from: string;
        to: string;
    } | null | undefined];
    episodeAll: () => readonly ["alert-episodes", "episode"];
    episode: (spaceId: string, episodeId: string) => readonly ["alert-episodes", "episode", string, string];
    episodeEventsAll: () => readonly ["alert-episodes", "episode-events"];
    episodeEvents: (spaceId: string, episodeId: string) => readonly ["alert-episodes", "episode-events", string, string];
    episodeFlappingAll: () => readonly ["alert-episodes", "episode-flapping"];
    episodeFlapping: (spaceId: string, episodeId: string) => readonly ["alert-episodes", "episode-flapping", string, string];
    episodeTrendAll: () => readonly ["alert-episodes", "episode-trend"];
    episodeTrend: (spaceId: string, episodeId: string, metricLabels: string[]) => readonly ["alert-episodes", "episode-trend", string, string, ...string[]];
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
    fetchRule: (id: string) => readonly ["alert-episodes", "fetch-rule", string];
    histogramAll: () => readonly ["alert-episodes", "histogram"];
    histogram: (spaceId: string | undefined, filterState: EpisodesFilterState, timeRange: TimeRange | undefined, breakdownField: string | undefined) => readonly ["alert-episodes", "histogram", string | undefined, EpisodesFilterState, TimeRange | undefined, string | undefined];
    currentUserProfile: () => readonly ["alert-episodes", "current-user-profile"];
    kpisAll: () => readonly ["alert-episodes", "kpis"];
    kpis: (spaceId: string, filterState?: EpisodesFilterState, timeRange?: {
        from: string;
        to: string;
    } | null, currentUserUid?: string) => readonly ["alert-episodes", "kpis", string, EpisodesFilterState | undefined, {
        from: string;
        to: string;
    } | null | undefined, string | undefined];
};
