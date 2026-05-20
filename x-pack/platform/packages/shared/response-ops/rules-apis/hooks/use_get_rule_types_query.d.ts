import type { HttpStart } from '@kbn/core-http-browser';
import type { UseQueryOptions } from '@kbn/react-query';
import { getRuleTypes } from '../apis/get_rule_types';
export interface GetRuleTypesQueryParams {
    http: HttpStart;
}
export declare const getKey: () => readonly [string, "getRuleTypes"];
export declare const useGetRuleTypesQuery: ({ http }: GetRuleTypesQueryParams, { onError, enabled, context, }: Pick<UseQueryOptions<typeof getRuleTypes>, "onError" | "enabled" | "context">) => import("@kbn/react-query").UseQueryResult<import("@kbn/triggers-actions-ui-types").RuleType<string, string>[], unknown>;
