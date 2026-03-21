import type { TypeOf } from '@kbn/config-schema';
export declare const ruleParamsSchema: import("@kbn/config-schema").Type<Record<string, any>>;
export declare const ruleParamsSchemaWithDefaultValue: import("@kbn/config-schema").Type<Record<string, any>>;
export declare const createRuleParamsExamples: () => string;
export type RuleParams = TypeOf<typeof ruleParamsSchema>;
export type RuleParamsWithDefaultValue = TypeOf<typeof ruleParamsSchemaWithDefaultValue>;
