/**
 * Splits an array of resource names into batches where each batch's
 * comma-joined string stays under {@link maxJoinedLength} characters.
 *
 * This is used to prevent `too_long_http_line_exception` errors from
 * Elasticsearch when many resource names are serialized into URL paths.
 */
export declare const batchByUrlLength: (names: string[], maxJoinedLength?: number) => string[][];
