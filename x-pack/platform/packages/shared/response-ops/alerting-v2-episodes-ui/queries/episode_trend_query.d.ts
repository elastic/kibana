import type { AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
export interface EpisodeTrendRow {
    '@timestamp': string;
    'episode.status': AlertEpisodeStatus;
    /**
     * Evaluated numeric value per requested metric label, or `null` when the event
     * recorded no value for it (e.g. a status-only lifecycle event).
     */
    metrics: Record<string, number | null>;
}
/**
 * ES|QL query returning every `.rule-events` event for an episode (oldest first),
 * carrying the lifecycle status and, for each requested metric label, the value the
 * rule evaluated for that execution. Unlike a re-aggregation of the source index,
 * these are the exact values the rule evaluated, at the timestamps it evaluated them
 * — and they are already scoped to the episode's group via `episode.id`.
 *
 * `METADATA _source` lets `JSON_EXTRACT` read the flattened `data` field. Rather than
 * shipping the whole `data` row, we project only the charted metrics — one column per
 * requested label, named after it — so the response carries just the values the trend
 * chart plots.
 */
export declare const buildEpisodeTrendQuery: (spaceId: string, episodeId: string, metricLabels: string[]) => import("@elastic/esql").ComposerQuery;
/**
 * Maps the raw ES|QL rows back into {@link EpisodeTrendRow}s, keying each event's values
 * by the metric label that produced them and coercing the extracted values to numbers
 * (`JSON_EXTRACT` returns keywords).
 */
export declare const parseEpisodeTrendRows: (rawRows: Array<Record<string, unknown>>, metricLabels: string[]) => EpisodeTrendRow[];
