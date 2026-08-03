import { type KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectReference } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/logging';
import { type RunRuleParams, type TaskRunnerContext } from './types';
import type { RawRule, RuleTypeRegistry, RuleTypeParamsValidator } from '../types';
import type { RuleTypeParams } from '../../common';
interface RuleData {
    rawRule: RawRule;
    version: string | undefined;
    references: SavedObjectReference[];
}
interface ValidateRuleAndCreateFakeRequestParams<Params extends RuleTypeParams> {
    context: TaskRunnerContext;
    logger: Logger;
    paramValidator?: RuleTypeParamsValidator<Params>;
    ruleData: RuleData;
    ruleId: string;
    ruleTypeRegistry: RuleTypeRegistry;
    spaceId: string;
}
/**
 * With the decrypted rule saved object
 * - transform from domain model to application model (rule)
 * - create a fakeRequest object using the rule API key
 * - get an instance of the RulesClient using the fakeRequest
 */
export declare function validateRuleAndCreateFakeRequest<Params extends RuleTypeParams>(params: ValidateRuleAndCreateFakeRequestParams<Params>): RunRuleParams<Params>;
/**
 * Loads the decrypted rule saved object
 */
export declare function getDecryptedRule(context: TaskRunnerContext, ruleId: string, spaceId: string): Promise<RuleData>;
/**
 * Builds the fake request a rule run executes under AND returns the resolved
 * credential it authenticates with, so callers (e.g. `ActionScheduler`) can
 * enqueue scheduled connector tasks under the same key. `effectiveApiKey` is
 * the value that was placed after `ApiKey ` in the request's `Authorization`
 * header — the base64 `id:secret` for ES rules, or the decoded raw `essu_…`
 * UIAM secret for UIAM rules.
 */
export interface GetFakeKibanaRequestOptions {
    uiamApiKey?: RawRule['uiamApiKey'];
    apiKeyCreatedByUser?: RawRule['apiKeyCreatedByUser'];
    apiKeyOwner?: RawRule['apiKeyOwner'];
    ruleId?: string;
}
export declare function getFakeKibanaRequest(context: TaskRunnerContext, spaceId: string, apiKey: RawRule['apiKey'], options?: GetFakeKibanaRequestOptions): {
    fakeRequest: KibanaRequest;
    effectiveApiKey: string | null;
};
export {};
