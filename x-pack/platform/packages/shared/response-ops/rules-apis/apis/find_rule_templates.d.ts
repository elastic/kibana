import type { HttpStart } from '@kbn/core-http-browser';
import type { AsApiContract } from '@kbn/actions-types';
export interface FindRuleTemplatesParams {
    http: HttpStart;
    page: number;
    perPage: number;
    search?: string;
    defaultSearchOperator?: string;
    sortField?: string;
    sortOrder?: string;
    ruleTypeId?: string;
    tags?: string[];
}
export interface RuleTemplate {
    id: string;
    name: string;
    ruleTypeId: string;
    tags: string[];
}
export interface FindRuleTemplatesResponse {
    total: number;
    page: number;
    perPage: number;
    data: RuleTemplate[];
}
export interface FindRuleTemplatesApiResponse extends Omit<AsApiContract<FindRuleTemplatesResponse>, 'data'> {
    data: AsApiContract<RuleTemplate>[];
}
export declare const rewriteTemplatesBodyRes: (response: FindRuleTemplatesApiResponse) => FindRuleTemplatesResponse;
export declare function findRuleTemplates({ http, page, perPage, search, defaultSearchOperator, sortField, sortOrder, ruleTypeId, tags, }: FindRuleTemplatesParams): Promise<FindRuleTemplatesResponse>;
