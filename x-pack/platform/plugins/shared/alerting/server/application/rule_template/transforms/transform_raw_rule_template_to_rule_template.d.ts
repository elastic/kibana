import type { AlertingV1RawRuleTemplate } from '../../../saved_objects/schemas/raw_rule_template';
import type { RuleTemplate } from '../types';
export interface TransformRawRuleTemplateToRuleTemplateParams {
    attributes: AlertingV1RawRuleTemplate;
    id: string;
}
/**
 * Maps Fleet-shaped / alerting v1 template SOs to the v1 application RuleTemplate.
 */
export declare const transformRawRuleTemplateToRuleTemplate: (params: TransformRawRuleTemplateToRuleTemplateParams) => RuleTemplate;
