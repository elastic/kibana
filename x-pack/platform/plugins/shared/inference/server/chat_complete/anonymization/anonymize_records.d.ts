import type { ElasticsearchClient } from '@kbn/core/server';
import type { AnonymizationRule } from '@kbn/inference-common';
import type { EffectivePolicy } from '@kbn/anonymization-common';
import { type AnonymizationState } from './types';
import type { RegexWorkerService } from './regex_worker_service';
export declare function anonymizeRecords<T extends Record<string, string | undefined>>({ input, anonymizationRules, regexWorker, esClient, salt, effectivePolicy, knownReplacements, }: {
    input: T[];
    anonymizationRules: AnonymizationRule[];
    regexWorker: RegexWorkerService;
    esClient: ElasticsearchClient;
    salt?: string;
    effectivePolicy?: EffectivePolicy;
    knownReplacements?: Array<{
        anonymized: string;
        original: string;
    }>;
}): Promise<AnonymizationState>;
