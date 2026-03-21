import type { KueryNode } from '@kbn/es-query';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-shared';
import type { RawRule } from '../../types';
export interface RuleForClassification {
    id: string;
    attributes: RawRule;
    version?: string;
}
export interface FetchFirstBatchOptions {
    excludeRulesFilter?: KueryNode;
    perPage?: number;
    ruleType: string;
}
/**
 * Opens a PIT finder for rules, fetches the first batch, closes the finder.
 * Returns the rules and whether more batches exist.
 */
export declare const fetchFirstBatchOfRulesToConvert: (encryptedSavedObjectsClient: EncryptedSavedObjectsClient, options: FetchFirstBatchOptions) => Promise<{
    rules: RuleForClassification[];
    hasMore: boolean;
}>;
