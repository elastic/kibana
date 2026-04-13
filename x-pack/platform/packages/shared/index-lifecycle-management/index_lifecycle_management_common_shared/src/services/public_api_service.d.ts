import type { PolicyFromES } from '../policies';
export interface PublicApiServiceSetup {
    /**
     * Fetches all ILM policies available in Index Lifecycle Management.
     */
    getPolicies(options?: {
        signal?: AbortSignal;
    }): Promise<PolicyFromES[]>;
}
