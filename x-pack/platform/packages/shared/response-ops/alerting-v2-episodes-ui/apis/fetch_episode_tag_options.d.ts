import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { type EpisodeTagOptionRow } from '../queries/episode_tag_options_query';
export interface FetchEpisodeTagOptionsParams {
    timeRange?: TimeRange | null;
    abortSignal?: AbortSignal;
    services: {
        expressions: ExpressionsStart;
    };
}
/**
 * Returns tag option rows from `.alert-actions` tag events in the given time range.
 */
export declare const fetchEpisodeTagOptions: ({ abortSignal, timeRange, services: { expressions }, }: FetchEpisodeTagOptionsParams) => Promise<EpisodeTagOptionRow[]>;
