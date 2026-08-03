import type { EpisodeEventRow } from '../queries/episode_events_query';
/**
 * Normalizes an episode event `data` payload from ES|QL.
 *
 * `JSON_EXTRACT` may return either a JSON string or a parsed object depending on
 * the transport layer; both shapes are accepted here.
 */
export declare const normalizeEpisodeEventDataPayload: (raw: unknown) => Record<string, unknown> | null;
/**
 * Resolves evaluation `data` for a single episode event row.
 */
export declare const resolveEpisodeEventData: (row: Pick<EpisodeEventRow, "data">) => Record<string, unknown> | null;
/** Serializes a single event-data value for display in the severity heatmap tooltip. */
export declare const formatEpisodeEventFieldValue: (value: unknown) => string;
export interface EpisodeEventFieldValueRow {
    field: string;
    value: string;
}
/** Flattens resolved event data into field/value rows for tooltip display. */
export declare const eventDataToFieldValueRows: (eventData: Record<string, unknown> | null) => EpisodeEventFieldValueRow[];
