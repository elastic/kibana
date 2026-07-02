/**
 * Generates a deterministic anonymization token for a field value.
 *
 * The token format is `<ENTITY_CLASS>_<HASH>` where the hash is derived from
 * a per-space secret using HMAC-SHA256.
 *
 * The same (secret, entityClass, field, value) tuple always produces the same
 * token, ensuring stability within a space. Different spaces use different
 * secrets, preventing cross-space token correlation.
 *
 * @param secret - Per-space secret material for HMAC (must be non-empty)
 * @param entityClass - Token prefix/class label (e.g., `HOST_NAME`, `USER_NAME`)
 * @param field - The field name being anonymized (e.g., `host.name`)
 * @param value - The original field value to anonymize
 * @param hashLength - Number of hex chars to include (default: 32, clamped to 1–64)
 * @returns A deterministic token string (e.g., `HOST_NAME_ae687f...`)
 */
export declare const generateToken: (secret: string, entityClass: string, field: string, value: string, hashLength?: number) => string;
