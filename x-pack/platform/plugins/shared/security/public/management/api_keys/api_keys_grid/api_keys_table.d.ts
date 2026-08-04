import type { estypes } from '@elastic/elasticsearch';
import type { Criteria, EuiSearchBarOnChangeArgs, Query } from '@elastic/eui';
import type { CustomComponentProps } from '@elastic/eui/src/components/search_bar/filters/custom_component_filter';
import type { FunctionComponent } from 'react';
import type { CreateAPIKeyResult, QueryApiKeySortOptions } from '@kbn/security-api-key-management';
import type { ApiKeyAggregations, CategorizedApiKey } from '@kbn/security-plugin-types-common';
import type { AuthenticatedUser } from '../../../../common';
export interface ApiKeysTableProps {
    apiKeys: CategorizedApiKey[];
    queryFilters: QueryFilters;
    currentUser: AuthenticatedUser;
    createdApiKey?: CreateAPIKeyResult;
    query: Query;
    readOnly?: boolean;
    loading?: boolean;
    canManageCrossClusterApiKeys: boolean;
    canManageApiKeys: boolean;
    canManageOwnApiKeys: boolean;
    onClick(apiKey: CategorizedApiKey): void;
    onDelete(apiKeys: CategorizedApiKey[]): void;
    totalItemCount?: number;
    onTableChange: ({ sort }: Criteria<CategorizedApiKey>) => void;
    onSearchChange: (args: EuiSearchBarOnChangeArgs) => boolean | void;
    aggregations?: ApiKeyAggregations;
    sortingOptions: QueryApiKeySortOptions;
    queryErrors?: Error;
    resetQuery: () => void;
    onFilterChange: (filters: QueryFilters) => void;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    onNextPage: () => void;
    onPreviousPage: () => void;
    onRefresh: () => void;
}
export interface QueryFilters {
    usernames?: string[];
    type?: 'rest' | 'managed' | 'cross_cluster';
    expired?: boolean;
}
export declare const ApiKeysTable: FunctionComponent<ApiKeysTableProps>;
export declare const TypesFilterButton: FunctionComponent<CustomComponentProps>;
export declare const ExpiredFilterButton: FunctionComponent<CustomComponentProps>;
export declare const UsersFilterButton: FunctionComponent<CustomComponentProps>;
export type UsernameWithIconProps = Pick<CategorizedApiKey, 'username'>;
export declare const UsernameWithIcon: FunctionComponent<UsernameWithIconProps>;
export declare const categorizeAggregations: (aggregationResponse?: ApiKeyAggregations) => {
    typeFilters: ("managed" | estypes.SecurityApiKeyType)[];
    usernameFilters: string[];
    expired: number;
};
