import type { ValidationResult } from '@kbn/triggers-actions-ui-plugin/public';
import type { EsQueryRuleParams } from './types';
export declare const validateExpression: (ruleParams: EsQueryRuleParams, isServerless?: boolean) => ValidationResult;
export declare const hasExpressionValidationErrors: (ruleParams: EsQueryRuleParams, isServerless: boolean) => boolean;
