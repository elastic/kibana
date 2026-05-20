import type { IlmPhases } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core/server';
export interface ExistingIlmPolicy {
    policy?: {
        phases?: IlmPhases;
        _meta?: Record<string, unknown>;
        deprecated?: boolean;
    };
}
/**
 * Fetches an existing ILM policy by name.
 * Returns `undefined` when the policy does not exist (404).
 */
export declare const getExistingPolicy: (scopedClusterClient: IScopedClusterClient, name: string) => Promise<ExistingIlmPolicy | undefined>;
/**
 * Validates that the policy name is valid. Throws a `StatusError` when:
 * - The policy already exists and `allowOverwrite` is `false`.
 */
export declare const assertPolicyNameIsValid: (existingPolicy: ExistingIlmPolicy | undefined, allowOverwrite: boolean) => void;
/**
 * Validates that the incoming policy phases are acceptable. Throws a
 * `StatusError` (400) when:
 *
 * - The policy has **no phases at all** (at least one is required).
 * - The `hot` phase is missing, unless:
 *   - **Updating** an existing policy that already has no `hot` phase.
 *   - **Creating** a new policy from a source policy that already has no `hot` phase.
 */
export declare const assertValidPolicyPhases: ({ existingPolicy, incomingPhases, sourcePolicy, }: {
    existingPolicy?: ExistingIlmPolicy;
    incomingPhases?: IlmPhases;
    sourcePolicy?: ExistingIlmPolicy;
}) => void;
