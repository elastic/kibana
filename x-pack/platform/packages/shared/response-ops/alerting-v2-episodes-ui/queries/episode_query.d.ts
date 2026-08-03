import type { ComposerQuery } from '@elastic/esql';
/**
 * Builds an ES|QL query that returns the single aggregated row for one episode,
 * reusing the same aggregation pipeline as the list query.
 */
export declare const buildEpisodeQuery: (spaceId: string, episodeId: string) => ComposerQuery;
