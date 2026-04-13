import { type RuleTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import type { DegradedDocsRuleParams } from '@kbn/response-ops-rule-params/degraded_docs';
import type { GetDescriptionFieldsFn } from '@kbn/triggers-actions-ui-plugin/public/types';
export declare const getDescriptionFields: GetDescriptionFieldsFn<DegradedDocsRuleParams>;
export declare function getRuleType(): RuleTypeModel<DegradedDocsRuleParams>;
