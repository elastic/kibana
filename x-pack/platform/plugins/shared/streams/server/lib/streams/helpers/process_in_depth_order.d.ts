/**
 * Processes items in depth-descending order: deepest items first, shallowest last.
 * Items at the same depth level are processed in parallel by default, or
 * sequentially when `sequential: true` is passed.
 *
 * This is essential when parent items reference children (e.g. ingest pipelines,
 * ES|QL views) — children must exist before parents are created.
 */
export declare function processInDepthOrder<T>(items: T[], getDepth: (item: T) => number, processFn: (item: T) => Promise<unknown>, options?: {
    sequential?: boolean;
}): Promise<void>;
