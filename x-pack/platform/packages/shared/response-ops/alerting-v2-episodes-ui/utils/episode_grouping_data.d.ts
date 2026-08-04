import type { DataView } from '@kbn/data-views-plugin/common';
/** Resolve a dot-path against nested objects or a single top-level key (e.g. flattened `host.name`). */
export declare const getValueByFieldPath: (data: Record<string, unknown>, field: string) => unknown;
/**
 * Fallback formatter used when no data view field metadata is available. Renders scalars directly
 * and flattens arrays/objects into a readable comma-separated list of their scalar leaves (rather
 * than dumping raw JSON, which is what made object-shaped values render as `{…}`).
 */
export declare const formatGroupingValueForDisplay: (value: unknown) => string;
/**
 * Formats a grouping value using the source data view's field metadata (via `fieldFormats`) when the field
 * is present in the data view, so typed fields (IP, date, number, …) render correctly. Falls back to
 * {@link formatGroupingValueForDisplay} when there is no data view, no matching field, or the formatter
 * yields an unusable result.
 */
export declare const formatGroupingValue: (field: string, rawValue: unknown, dataView?: DataView) => string;
/** Grouping fields whose formatted value is non-empty (whitespace-only counts as empty). */
export declare const getNonEmptyGroupingFields: (fields: readonly string[], data: Record<string, unknown>, dataView?: DataView) => string[];
export declare const parseEpisodeDataJson: (raw: unknown) => Record<string, unknown>;
