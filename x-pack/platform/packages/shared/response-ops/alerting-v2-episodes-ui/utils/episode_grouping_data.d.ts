/** Resolve a dot-path against nested objects or a single top-level key (e.g. flattened `host.name`). */
export declare const getValueByFieldPath: (data: Record<string, unknown>, field: string) => unknown;
export declare const formatGroupingValueForDisplay: (value: unknown) => string;
/** Grouping fields whose formatted value is non-empty (whitespace-only counts as empty). */
export declare const getNonEmptyGroupingFields: (fields: readonly string[], data: Record<string, unknown>) => string[];
export declare const parseEpisodeDataJson: (raw: unknown) => Record<string, unknown>;
