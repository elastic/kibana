import type { TypeOf } from '@kbn/config-schema';
import type { alertingV1RawRuleTemplateSchemaV4, alertingV2RawRuleTemplateSchemaV4, rawRuleTemplateSchema } from './v4';
type RawRuleTemplate = TypeOf<typeof rawRuleTemplateSchema>;
type AlertingV1RawRuleTemplate = TypeOf<typeof alertingV1RawRuleTemplateSchemaV4>;
type AlertingV2RawRuleTemplate = TypeOf<typeof alertingV2RawRuleTemplateSchemaV4>;
export declare const isAlertingV2RawRuleTemplate: (attributes: RawRuleTemplate) => attributes is AlertingV2RawRuleTemplate;
/**
 * Narrows raw template attributes to the Fleet / alerting v1 shape used by the
 * v1 rule template application API.
 */
export declare const assertAlertingV1RawRuleTemplate: (attributes: RawRuleTemplate, id: string) => AlertingV1RawRuleTemplate;
export {};
