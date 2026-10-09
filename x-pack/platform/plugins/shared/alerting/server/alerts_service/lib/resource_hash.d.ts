/**
 * `_meta` field where the content hash of a managed alerts-as-data resource is
 * stamped, so a later install can detect that nothing changed and skip the write.
 */
export declare const RESOURCE_CONTENT_HASH_META_FIELD = "content_hash";
/**
 * Computes a stable content hash of a resource body. Used to stamp managed
 * resources and to compare an already-installed resource against the one we are
 * about to install, so unchanged resources can skip the (cluster-state) write.
 */
export declare const computeResourceHash: (body: unknown) => string;
