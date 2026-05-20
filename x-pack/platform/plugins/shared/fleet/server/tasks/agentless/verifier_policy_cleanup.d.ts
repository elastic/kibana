/** TTL after verifier policy creation before it is eligible for deletion (phase 1). */
export declare const VERIFICATION_TTL_MS: number;
/**
 * Delete verifier agent policies (`is_verifier: true`) whose `created_at` age
 * exceeds {@link VERIFICATION_TTL_MS}. Shared by the verify-permissions task and
 * the dedicated cleanup task.
 *
 * No-ops when `enableOTelVerifier` is disabled (same as verify task).
 */
export declare function runVerifierPolicyCleanup(abortController: AbortController): Promise<void>;
