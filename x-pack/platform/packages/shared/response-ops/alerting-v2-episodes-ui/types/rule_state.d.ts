import type { UseQueryResult } from '@kbn/react-query';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
export declare enum RuleStateStatus {
    idle = "idle",
    loading = "loading",
    not_found = "not_found",
    forbidden = "forbidden",
    error = "error",
    loaded = "loaded"
}
export interface IdleRuleState {
    status: RuleStateStatus.idle;
}
export interface LoadingRuleState {
    status: RuleStateStatus.loading;
    ruleId: string;
}
export interface NotFoundRuleState {
    status: RuleStateStatus.not_found;
    ruleId: string;
}
export interface ForbiddenRuleState {
    status: RuleStateStatus.forbidden;
    ruleId: string;
}
export interface ErrorRuleState {
    status: RuleStateStatus.error;
    ruleId: string;
    error: Error;
}
export interface LoadedRuleState {
    status: RuleStateStatus.loaded;
    ruleId: string;
    rule: RuleResponse;
}
export type RuleState = IdleRuleState | LoadingRuleState | NotFoundRuleState | ForbiddenRuleState | ErrorRuleState | LoadedRuleState;
/**
 * Maps a react-query rule fetch result into a single discriminated union.
 */
export declare const toRuleState: (id: string | undefined, query: Pick<UseQueryResult<RuleResponse>, "data" | "isLoading" | "isError" | "error">) => RuleState;
export declare const getRuleIdFromRuleState: (state: RuleState) => string | undefined;
export declare const isRuleLoaded: (state: RuleState) => state is LoadedRuleState;
export declare const isRuleLoading: (state: RuleState) => state is LoadingRuleState;
export declare const isRuleNotFound: (state: RuleState) => state is NotFoundRuleState;
export declare const isRuleForbidden: (state: RuleState) => state is ForbiddenRuleState;
export declare const isRuleError: (state: RuleState) => state is ErrorRuleState;
