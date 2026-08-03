import type { HttpStart } from '@kbn/core-http-browser';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
export interface FetchRulesByIdsParams {
    http: HttpStart;
    ids: string[];
}
/**
 * Resolves rules by id via the find API and a KQL id filter.
 * Missing/deleted ids are omitted from the response without failing the request.
 */
export declare const fetchRulesByIds: ({ http, ids, }: FetchRulesByIdsParams) => Promise<RuleResponse[]>;
