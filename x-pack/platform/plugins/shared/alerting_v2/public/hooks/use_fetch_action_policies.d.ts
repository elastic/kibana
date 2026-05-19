import type { FindActionPoliciesResponse } from '../services/action_policies_api';
interface UseFetchActionPoliciesParams {
    page: number;
    perPage: number;
    search?: string;
    tags?: string[];
    enabled?: boolean;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
}
export declare const useFetchActionPolicies: ({ page, perPage, search, tags, enabled, sortField, sortOrder, }: UseFetchActionPoliciesParams) => import("@kbn/react-query").UseQueryResult<FindActionPoliciesResponse, Error>;
export {};
