import type { ContentListItem, DataSourceConfig } from '@kbn/content-list';
import type { ActionPolicyResponse, FindActionPoliciesRequest, FindActionPoliciesSortField } from '@kbn/alerting-v2-schemas';
import { type Complete } from '../../mapper_types';
/** Filter dimension key for the enabled/disabled state filter. */
export declare const ENABLED_FILTER_ID = "enabled";
export interface FindActionPoliciesUiParams {
    page?: number;
    perPage?: number;
    search?: string;
    tags?: string[];
    enabled?: boolean;
    sortField?: FindActionPoliciesSortField;
    sortOrder?: 'asc' | 'desc';
}
export declare const toFindActionPoliciesRequest: ({ page, perPage, search, tags, enabled, sortField, sortOrder, ...rest }: FindActionPoliciesUiParams) => Complete<FindActionPoliciesRequest>;
export type ActionPolicyContentListItem = ContentListItem & {
    policy: ActionPolicyResponse;
};
export declare const useActionPoliciesDataSource: () => DataSourceConfig;
