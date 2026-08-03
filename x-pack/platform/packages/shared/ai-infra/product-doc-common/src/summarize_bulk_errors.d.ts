interface SummarizableBulkResponse {
    /** Accepts official ES `BulkResponse.items` without requiring ES client types here. */
    items: readonly unknown[];
}
/**
 * Summarizes bulk item failures without dumping the full response (which can be
 * large/noisy and may include request payloads / embeddings).
 *
 * Generic ES bulk helper hosted in `@kbn/product-doc-common` for reuse by the
 * KB artifact builders (product-doc and Security Labs).
 */
export declare const summarizeBulkErrors: (response: SummarizableBulkResponse) => string;
export {};
