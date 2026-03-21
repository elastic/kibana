import type { ElasticsearchClient } from '@kbn/core/server';
import type { ChatCompleteAnonymizationTarget } from '@kbn/inference-common';
import type { EffectivePolicy } from '@kbn/anonymization-common';
export interface InferenceAnonymizationOptions {
    /** Promise resolving per-space salt for deterministic tokenization. */
    saltPromise?: Promise<string | undefined>;
    resolveEffectivePolicy?: (target?: ChatCompleteAnonymizationTarget) => Promise<EffectivePolicy | undefined>;
    replacements?: {
        esClient?: ElasticsearchClient;
        encryptionKeyPromise?: Promise<string | undefined>;
        usePersistentReplacements?: boolean;
        requireEncryptionKey?: boolean;
    };
}
