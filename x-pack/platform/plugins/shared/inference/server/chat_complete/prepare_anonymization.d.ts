import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { AnonymizationRule, ChatCompleteAnonymizationTarget, ChatCompleteOptions } from '@kbn/inference-common';
import type { EffectivePolicy } from '@kbn/anonymization-common';
import type { RegexWorkerService } from './anonymization/regex_worker_service';
interface PrepareAnonymizationOptions {
    namespace: string;
    logger: Logger;
    anonymizationRules: AnonymizationRule[];
    regexWorker: RegexWorkerService;
    esClient: ElasticsearchClient;
    replacementsEsClient?: ElasticsearchClient;
    replacementsEncryptionKeyPromise?: Promise<string | undefined>;
    usePersistentReplacements?: boolean;
    requireReplacementsEncryptionKey?: boolean;
    saltPromise?: Promise<string | undefined>;
    resolveEffectivePolicy?: (target?: ChatCompleteAnonymizationTarget) => Promise<EffectivePolicy | undefined>;
    metadata?: ChatCompleteOptions['metadata'];
    system?: ChatCompleteOptions['system'];
    messages: ChatCompleteOptions['messages'];
}
export declare const prepareAnonymization: ({ namespace, logger, anonymizationRules, regexWorker, esClient, replacementsEsClient, replacementsEncryptionKeyPromise, usePersistentReplacements, requireReplacementsEncryptionKey, saltPromise, resolveEffectivePolicy, metadata, system, messages, }: PrepareAnonymizationOptions) => Promise<{
    anonymization: import("@kbn/inference-common").AnonymizationOutput;
    replacementsId: undefined;
    effectivePolicy: EffectivePolicy | undefined;
} | {
    anonymization: import("@kbn/inference-common").AnonymizationOutput;
    replacementsId: string;
    effectivePolicy: EffectivePolicy | undefined;
}>;
export {};
