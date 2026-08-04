import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { AlertEpisode } from '../queries/episodes_query';
export interface FetchRelatedEpisodesOptions {
    /** Pre-built related-episodes ES|QL (e.g. from `build*RelatedAlertEpisodesEsqlQuery(…).print('basic')`). */
    query: string;
    pageSize: number;
    abortSignal?: AbortSignal;
    expressions: ExpressionsStart;
}
/**
 * Runs a related-episodes ES|QL string through the expressions `esql` function with a page size variable.
 */
export declare const fetchRelatedEpisodes: ({ abortSignal, pageSize, query, expressions, }: FetchRelatedEpisodesOptions) => Promise<AlertEpisode[]>;
