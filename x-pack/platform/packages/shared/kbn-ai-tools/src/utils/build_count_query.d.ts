/**
 * Builds an ES|QL query string that counts documents in one or more indices,
 * optionally filtered by a KQL expression. Time filtering is expected to be
 * applied via the `filter` parameter on the ES|QL query API by the caller.
 */
export declare function buildCountQuery({ index, kql, }: {
    index: string | string[];
    kql?: string;
}): string;
