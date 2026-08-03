import type { HttpStart } from '@kbn/core-http-browser';
import type { RewriteRequestCase } from '@kbn/actions-types';
export interface GetRuleTagsParams {
    search?: string;
    ruleTypeIds?: string[];
    perPage?: number;
    page: number;
    http: HttpStart;
}
export interface GetRuleTagsResponse {
    total: number;
    page: number;
    perPage: number;
    data: string[];
}
export declare const rewriteTagsBodyRes: RewriteRequestCase<GetRuleTagsResponse>;
export declare function getRuleTags({ http, search, ruleTypeIds, perPage, page, }: GetRuleTagsParams): Promise<GetRuleTagsResponse>;
