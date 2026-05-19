import type { SavedObject } from '@kbn/core/server';
import type { RawRule } from '../../../../types';
import type { RulesClientContext } from '../../../../rules_client/types';
interface LogRuleChanges {
    /**
     * Rule saved objects after applying the changes
     */
    ruleSOs: Array<SavedObject<RawRule>>;
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
         * Original timestamp of the change
         */
        timestamp: string | number | Date;
        /**
         * Change metadata object to be written to the each change history item
         */
        metadata?: {
            /**
             * Original number of rules affected by the bulk action.
             *
             * Driving code should provide this number for bulk actions.
             * Due to OCC we can't capture this number deeper in the call stack.
             *
             * Default: ruleSOs.length when not provided
             */ bulkCount?: number;
        } & Record<string, number | boolean | string>;
    };
}
export declare function logRuleChanges({ ruleSOs, rulesClientContext: { changeTrackingService, ruleTypeRegistry, logger, spaceId }, changesContext: { action, timestamp, metadata }, }: LogRuleChanges): Promise<void>;
export {};
