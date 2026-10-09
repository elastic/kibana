import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { SavedObjectsClientContract, SavedObjectsFindResponse } from '@kbn/core/server';
import type { KueryNode } from '@kbn/es-query';
import type { AlertingV1RawRuleTemplate } from '../../../saved_objects/schemas/raw_rule_template';
export interface SearchRuleTemplatesSoParams {
    savedObjectsClient: SavedObjectsClientContract;
    namespaces: string[];
    page?: number;
    perPage?: number;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
    filter?: KueryNode;
    searchQuery?: QueryDslQueryContainer;
}
/**
 * Lists Fleet / alerting v1 rule templates through Saved Objects `search()`.
 * A typed string becomes a wildcard must clause. An empty box is the same
 * query without that clause.
 */
export declare const searchRuleTemplatesSo: (params: SearchRuleTemplatesSoParams) => Promise<SavedObjectsFindResponse<AlertingV1RawRuleTemplate>>;
