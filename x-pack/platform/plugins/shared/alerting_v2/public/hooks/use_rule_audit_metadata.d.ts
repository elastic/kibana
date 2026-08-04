import type { RuleResponse } from '@kbn/alerting-v2-schemas';
type RuleAuditFields = Pick<RuleResponse, 'createdBy' | 'createdAt' | 'updatedBy' | 'updatedAt'>;
export interface RuleAuditMetadata {
    createdByDisplay: string;
    createdAtFormatted: string;
    updatedByDisplay: string;
    updatedAtFormatted: string;
}
export declare const useRuleAuditMetadata: (rule?: RuleAuditFields) => RuleAuditMetadata;
export {};
