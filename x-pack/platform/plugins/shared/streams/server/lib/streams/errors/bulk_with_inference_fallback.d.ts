import type { Logger } from '@kbn/core/server';
import type { BulkOperationError } from '@kbn/storage-adapter';
/**
 * Returns `true` when **every** errored item in the bulk response has an
 * inference-related error (type/reason contains "inference"), and there is
 * at least one errored item.
 */
export declare function isInferenceRelatedBulkError(error: BulkOperationError): boolean;
/**
 * Executes a bulk write that may include a `semantic_text` embedding field.
 *
 * Inference failures are usually transient -- the ML node may still be warming
 * up, or the inference service may be overwhelmed. The operation is retried up
 * to `MAX_INFERENCE_ATTEMPTS` times with exponential backoff (2s, 4s, ...) while
 * keeping the embedding field in place, giving inference time to recover.
 *
 * If every retry still fails with inference-only errors, the write is replayed
 * once without the `semantic_text` field as a last-resort fallback. This trades
 * embedding precision for data availability when inference is unavailable for
 * an extended period; missing embeddings will be regenerated on the next
 * successful write.
 *
 * Non-inference bulk errors, mixed failures (some inference, some other), and
 * all other error types propagate immediately without retry or fallback.
 *
 * On partial success (some items indexed before the failure) the fallback
 * replays the entire batch without embeddings. This can strip embeddings from
 * items that succeeded on the first attempt. We accept this trade-off because
 * these are single-shard system indices where all-or-nothing inference failure
 * is the overwhelmingly common case.
 *
 * This avoids any pre-flight inference probing -- Elasticsearch decides
 * whether the embedding can be computed at write time.
 */
export declare function bulkWithInferenceFallback<T>(logger: Logger, attempt: (opts: {
    includeEmbedding: boolean;
}) => Promise<T>): Promise<T>;
