import type { JsonArray } from '@kbn/utility-types';
import type { LogMessagePart } from '../../../../common/log_entry';
import type { LogMessageFormattingRule } from './rule_types';
export declare function compileFormattingRules(rules: LogMessageFormattingRule[]): CompiledLogMessageFormattingRule;
export interface Fields {
    [fieldName: string]: JsonArray;
}
export interface Highlights {
    [fieldName: string]: string[];
}
export interface CompiledLogMessageFormattingRule {
    requiredFields: string[];
    fulfillsCondition(fields: Fields): boolean;
    format(fields: Fields, highlights: Highlights): LogMessagePart[];
}
export interface CompiledLogMessageFormattingCondition {
    conditionFields: string[];
    fulfillsCondition(fields: Fields): boolean;
}
export interface CompiledLogMessageFormattingInstruction {
    formattingFields: string[];
    format(fields: Fields, highlights: Highlights): LogMessagePart[];
}
