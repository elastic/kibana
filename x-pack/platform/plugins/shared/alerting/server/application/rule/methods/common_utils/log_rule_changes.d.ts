import type { RuleChangeTrackingMetadata } from '@kbn/alerting-types';
import type { SavedObjectBulkResult } from '@kbn/core/server';
import type { RawRule } from '../../../../types';
import type { RulesClientContext } from '../../../../rules_client/types';
interface EncryptedRuleFields {
    apiKey?: string | null;
    uiamApiKey?: string | null;
}
interface LogRuleChanges {
    /**
     * Rule saved objects after applying the changes
     */
    ruleSOs: Array<SavedObjectBulkResult<RawRule>>;
    /**
     * Plaintext encrypted field values keyed by rule id. When provided, the
     * corresponding SO attributes are overlaid before building the snapshot so
     * the real values are captured (the SO may contain ciphertext after a save
     * via unsecuredSavedObjectsClient).
     */
    encryptedFieldsMap?: Map<string, EncryptedRuleFields>;
    /**
     * Context information describing the changes
     */
    rulesClientContext: RulesClientContext;
    changesContext: {
        /**
         * Action performed on rule, e.g. rule_create or rule_update
         */
        action: string;
        /**
         * Original timestamp of the change. Uses `ruleSO.updated_at` when omitted.
         */
        timestamp?: string | number | Date;
        /**
         * Change metadata object to be written to the each change history item
         */
        metadata?: RuleChangeTrackingMetadata;
        /**
         * Controls ES index refresh behavior. Pass `'wait_for'` when the history
         * entry must be immediately searchable after the write.
         */
        refresh?: boolean | 'wait_for';
    };
}
export declare function logRuleChanges({ ruleSOs, encryptedFieldsMap, rulesClientContext: { changeTrackingService, ruleTypeRegistry, logger, spaceId, isSystemAction, uiSettings, unsecuredSavedObjectsClient, }, changesContext: { action, timestamp, metadata, refresh }, }: LogRuleChanges): Promise<void>;
export {};
