import type { ResourceType } from './resource_type';
export declare const productDocInferenceIdCandidates: readonly [".jina-embeddings-v5-text-small", ".elser-2-elastic", ".elser-2-elasticsearch"];
export interface ResolveDefaultInferenceIdOptions {
    /**
     * Reserved for future resource-specific defaults. Currently unused: all knowledge
     * base content (product docs, Security Labs, OpenAPI) shares the same Jina → EIS
     * ELSER → ELSER priority.
     */
    resourceType?: ResourceType;
}
/**
 * Resolves the default inference ID for knowledge base installation,
 * matching the priority used by GenAI Settings.
 *
 * All knowledge base content prefers Jina v5 when its endpoint is available
 * (EIS on serverless or Cloud Connected Mode), then EIS ELSER, then the default
 * ELSER. Because Jina is only selected when its endpoint actually exists,
 * on-prem clusters without EIS/CCM fall back to ELSER automatically.
 */
export declare const resolveDefaultInferenceId: (endpointIds: ReadonlySet<string>, _options?: ResolveDefaultInferenceIdOptions) => string;
/**
 * Returns inference IDs to check for installed product documentation, with the
 * environment default first followed by other supported embedding models.
 */
export declare const getProductDocInferenceIdCandidates: (defaultInferenceId: string) => string[];
export declare const resolveDefaultInferenceIdFromInferenceGet: (inferenceGet: () => Promise<{
    endpoints?: Array<{
        inference_id: string;
    }>;
}>, options?: ResolveDefaultInferenceIdOptions) => Promise<string>;
export declare const resolveInstalledProductDocInferenceId: ({ getDefaultInferenceId, isDocumentationAvailable, }: {
    getDefaultInferenceId: () => Promise<string>;
    isDocumentationAvailable: (inferenceId: string) => Promise<boolean>;
}) => Promise<string | undefined>;
