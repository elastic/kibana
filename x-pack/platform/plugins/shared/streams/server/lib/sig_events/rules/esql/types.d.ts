import type { RuleTypeParams, RuleTypeState } from '@kbn/alerting-plugin/common';
import { z } from '@kbn/zod/v4';
export interface EsqlRuleInstanceState extends RuleTypeState {
    previousOriginalDocumentIds?: string[];
}
export declare const esqlRuleInstanceState: z.ZodObject<{
    previousOriginalDocumentIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export interface EsqlRuleParams extends RuleTypeParams {
    query: string;
    timestampField: string;
}
export declare const esqlRuleParams: z.ZodObject<{
    query: z.ZodString;
    timestampField: z.ZodString;
}, z.core.$strip>;
