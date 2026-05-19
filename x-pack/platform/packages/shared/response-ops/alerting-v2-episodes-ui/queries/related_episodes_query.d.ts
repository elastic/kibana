import type { ComposerQuery } from '@elastic/esql';
export declare const RELATED_EPISODE_FIELDS: readonly ["@timestamp", "episode.id", "episode.status", "rule.id", "group_hash", "first_timestamp", "last_timestamp", "duration", "episode_data"];
export declare const finishRelatedEpisodesQuery: (query: ComposerQuery) => ComposerQuery;
export declare const buildRelatedBaseQuery: (ruleId: string, excludeEpisodeId: string) => ComposerQuery;
