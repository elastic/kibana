/**
 * Generates a deterministic mask/token for an anonymized entity.
 *
 * When a per-space salt is provided (via AnonymizationPolicyService),
 * uses HMAC-SHA256 for deterministic, salted tokenization that is stable
 * within a space and prevents cross-space correlation.
 *
 * When no salt is provided (fallback mode), uses the legacy object-hash
 * approach for backwards compatibility with existing behavior.
 *
 * @param entity - The entity to mask (class_name + value, optional field)
 * @param salt - Per-space secret material (optional; from AnonymizationPolicyService)
 */
export declare function getEntityMask(entity: {
    class_name: string;
    value: string;
    field?: string;
}, salt?: string): string;
