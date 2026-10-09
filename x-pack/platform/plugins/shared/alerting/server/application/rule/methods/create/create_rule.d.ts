import type { RuleChangeTracking } from '@kbn/alerting-types';
import type { RulesClientContext } from '../../../../rules_client/types';
import type { RuleParams } from '../../types';
import type { SanitizedRule } from '../../../../types';
import type { CreateRuleData } from './types';
export interface CreateRuleOptions {
    id?: string;
    initialRevision?: number;
    /**
     * Declares that the API key the request authenticated with is borrowed (e.g. granted by Task
     * Manager for a background task) and must not become the rule's key: a framework-owned key with
     * the same privileges is minted for the rule instead. A no-op when the request is not
     * authenticated with an API key, so callers may set it unconditionally.
     */
    cloneApiKey?: boolean;
}
/** Matches HTTP create `template_id` maxLength. */
export declare const RULE_CREATE_TEMPLATE_ID_MAX_LENGTH = 1024;
export interface CreateRuleParams<Params extends RuleParams = never> {
    data: CreateRuleData<Params>;
    options?: CreateRuleOptions;
    changeTracking?: RuleChangeTracking;
    allowMissingConnectorSecrets?: boolean;
    /**
     * The id of the rule template this rule was created from, when known (e.g. gallery
     * create-from-template, or Fleet installing a rule from a package template). Used only
     * for telemetry - it is not persisted on the rule saved object.
     */
    templateId?: string;
}
export declare function createRule<Params extends RuleParams = never>(context: RulesClientContext, createParams: CreateRuleParams<Params>): Promise<SanitizedRule<Params>>;
