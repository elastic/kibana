import type { ElasticsearchClient } from '@kbn/core/server';
import type { AnonymizationOutput, AnonymizationRule, Message } from '@kbn/inference-common';
import type { EffectivePolicy } from '@kbn/anonymization-common';
import type { RegexWorkerService } from './regex_worker_service';
export declare function anonymizeMessages({ system, messages, anonymizationRules, regexWorker, esClient, salt, effectivePolicy, knownReplacements, }: {
    system?: string | undefined;
    messages: Message[];
    anonymizationRules: AnonymizationRule[];
    regexWorker: RegexWorkerService;
    esClient: ElasticsearchClient;
    salt?: string;
    effectivePolicy?: EffectivePolicy;
    knownReplacements?: Array<{
        anonymized: string;
        original: string;
    }>;
}): Promise<AnonymizationOutput>;
