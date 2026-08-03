import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
export type { RuleState, LoadedRuleState } from '../types/rule_state';
export { getRuleIdFromRuleState, isRuleError, isRuleForbidden, isRuleLoaded, isRuleLoading, isRuleNotFound, RuleStateStatus, } from '../types/rule_state';
export interface UseFetchRuleOptions {
    id: string | undefined;
    http: HttpStart;
    notifications?: NotificationsStart;
}
export declare const useFetchRule: ({ id, http, notifications }: UseFetchRuleOptions) => {
    ruleState: import("./use_fetch_rule").RuleState;
    data: {
        kind: "signal" | "alert";
        time_field: string;
        schedule: {
            every: string;
            lookback?: string | undefined;
        };
        query: {
            format: "composed";
            base: string;
            breach: {
                segment: string;
            };
            recovery?: {
                segment: string;
            } | undefined;
        } | {
            format: "standalone";
            breach: {
                query: string;
            };
            recovery?: {
                query: string;
            } | undefined;
            no_data?: {
                query: string;
            } | undefined;
        };
        id: string;
        metadata: {
            name: string;
            version: number;
            description?: string | undefined;
            owner?: string | undefined;
            tags?: string[] | undefined;
            builder_type?: string | undefined;
        };
        enabled: boolean;
        createdBy: string | null;
        createdAt: string;
        updatedBy: string | null;
        updatedAt: string;
        recovery_strategy?: "query" | "none" | "no_breach" | undefined;
        no_data_strategy?: "none" | "emit" | "recover" | "last_known_status" | undefined;
        state_transition?: {
            pending_operator?: "AND" | "OR" | undefined;
            pending_count?: number | undefined;
            pending_timeframe?: string | undefined;
            recovering_operator?: "AND" | "OR" | undefined;
            recovering_count?: number | undefined;
            recovering_timeframe?: string | undefined;
        } | null | undefined;
        grouping?: {
            fields: string[];
        } | undefined;
        artifacts?: {
            id: string;
            type: string;
            value: string;
        }[] | undefined;
        version?: string | undefined;
    };
    error: unknown;
    isError: true;
    isLoading: false;
    isLoadingError: false;
    isRefetchError: true;
    isSuccess: false;
    status: "error";
    dataUpdatedAt: number;
    errorUpdatedAt: number;
    failureCount: number;
    failureReason: unknown;
    errorUpdateCount: number;
    isFetched: boolean;
    isFetchedAfterMount: boolean;
    isFetching: boolean;
    isInitialLoading: boolean;
    isPaused: boolean;
    isPlaceholderData: boolean;
    isPreviousData: boolean;
    isRefetching: boolean;
    isStale: boolean;
    refetch: <TPageData>(options?: (import("@tanstack/query-core").RefetchOptions & import("@tanstack/query-core").RefetchQueryFilters<TPageData>) | undefined) => Promise<import("@tanstack/query-core").QueryObserverResult<{
        kind: "signal" | "alert";
        time_field: string;
        schedule: {
            every: string;
            lookback?: string | undefined;
        };
        query: {
            format: "composed";
            base: string;
            breach: {
                segment: string;
            };
            recovery?: {
                segment: string;
            } | undefined;
        } | {
            format: "standalone";
            breach: {
                query: string;
            };
            recovery?: {
                query: string;
            } | undefined;
            no_data?: {
                query: string;
            } | undefined;
        };
        id: string;
        metadata: {
            name: string;
            version: number;
            description?: string | undefined;
            owner?: string | undefined;
            tags?: string[] | undefined;
            builder_type?: string | undefined;
        };
        enabled: boolean;
        createdBy: string | null;
        createdAt: string;
        updatedBy: string | null;
        updatedAt: string;
        recovery_strategy?: "query" | "none" | "no_breach" | undefined;
        no_data_strategy?: "none" | "emit" | "recover" | "last_known_status" | undefined;
        state_transition?: {
            pending_operator?: "AND" | "OR" | undefined;
            pending_count?: number | undefined;
            pending_timeframe?: string | undefined;
            recovering_operator?: "AND" | "OR" | undefined;
            recovering_count?: number | undefined;
            recovering_timeframe?: string | undefined;
        } | null | undefined;
        grouping?: {
            fields: string[];
        } | undefined;
        artifacts?: {
            id: string;
            type: string;
            value: string;
        }[] | undefined;
        version?: string | undefined;
    }, unknown>>;
    remove: () => void;
    fetchStatus: import("@tanstack/query-core").FetchStatus;
} | {
    ruleState: import("./use_fetch_rule").RuleState;
    data: {
        kind: "signal" | "alert";
        time_field: string;
        schedule: {
            every: string;
            lookback?: string | undefined;
        };
        query: {
            format: "composed";
            base: string;
            breach: {
                segment: string;
            };
            recovery?: {
                segment: string;
            } | undefined;
        } | {
            format: "standalone";
            breach: {
                query: string;
            };
            recovery?: {
                query: string;
            } | undefined;
            no_data?: {
                query: string;
            } | undefined;
        };
        id: string;
        metadata: {
            name: string;
            version: number;
            description?: string | undefined;
            owner?: string | undefined;
            tags?: string[] | undefined;
            builder_type?: string | undefined;
        };
        enabled: boolean;
        createdBy: string | null;
        createdAt: string;
        updatedBy: string | null;
        updatedAt: string;
        recovery_strategy?: "query" | "none" | "no_breach" | undefined;
        no_data_strategy?: "none" | "emit" | "recover" | "last_known_status" | undefined;
        state_transition?: {
            pending_operator?: "AND" | "OR" | undefined;
            pending_count?: number | undefined;
            pending_timeframe?: string | undefined;
            recovering_operator?: "AND" | "OR" | undefined;
            recovering_count?: number | undefined;
            recovering_timeframe?: string | undefined;
        } | null | undefined;
        grouping?: {
            fields: string[];
        } | undefined;
        artifacts?: {
            id: string;
            type: string;
            value: string;
        }[] | undefined;
        version?: string | undefined;
    };
    error: null;
    isError: false;
    isLoading: false;
    isLoadingError: false;
    isRefetchError: false;
    isSuccess: true;
    status: "success";
    dataUpdatedAt: number;
    errorUpdatedAt: number;
    failureCount: number;
    failureReason: unknown;
    errorUpdateCount: number;
    isFetched: boolean;
    isFetchedAfterMount: boolean;
    isFetching: boolean;
    isInitialLoading: boolean;
    isPaused: boolean;
    isPlaceholderData: boolean;
    isPreviousData: boolean;
    isRefetching: boolean;
    isStale: boolean;
    refetch: <TPageData>(options?: (import("@tanstack/query-core").RefetchOptions & import("@tanstack/query-core").RefetchQueryFilters<TPageData>) | undefined) => Promise<import("@tanstack/query-core").QueryObserverResult<{
        kind: "signal" | "alert";
        time_field: string;
        schedule: {
            every: string;
            lookback?: string | undefined;
        };
        query: {
            format: "composed";
            base: string;
            breach: {
                segment: string;
            };
            recovery?: {
                segment: string;
            } | undefined;
        } | {
            format: "standalone";
            breach: {
                query: string;
            };
            recovery?: {
                query: string;
            } | undefined;
            no_data?: {
                query: string;
            } | undefined;
        };
        id: string;
        metadata: {
            name: string;
            version: number;
            description?: string | undefined;
            owner?: string | undefined;
            tags?: string[] | undefined;
            builder_type?: string | undefined;
        };
        enabled: boolean;
        createdBy: string | null;
        createdAt: string;
        updatedBy: string | null;
        updatedAt: string;
        recovery_strategy?: "query" | "none" | "no_breach" | undefined;
        no_data_strategy?: "none" | "emit" | "recover" | "last_known_status" | undefined;
        state_transition?: {
            pending_operator?: "AND" | "OR" | undefined;
            pending_count?: number | undefined;
            pending_timeframe?: string | undefined;
            recovering_operator?: "AND" | "OR" | undefined;
            recovering_count?: number | undefined;
            recovering_timeframe?: string | undefined;
        } | null | undefined;
        grouping?: {
            fields: string[];
        } | undefined;
        artifacts?: {
            id: string;
            type: string;
            value: string;
        }[] | undefined;
        version?: string | undefined;
    }, unknown>>;
    remove: () => void;
    fetchStatus: import("@tanstack/query-core").FetchStatus;
} | {
    ruleState: import("./use_fetch_rule").RuleState;
    data: undefined;
    error: unknown;
    isError: true;
    isLoading: false;
    isLoadingError: true;
    isRefetchError: false;
    isSuccess: false;
    status: "error";
    dataUpdatedAt: number;
    errorUpdatedAt: number;
    failureCount: number;
    failureReason: unknown;
    errorUpdateCount: number;
    isFetched: boolean;
    isFetchedAfterMount: boolean;
    isFetching: boolean;
    isInitialLoading: boolean;
    isPaused: boolean;
    isPlaceholderData: boolean;
    isPreviousData: boolean;
    isRefetching: boolean;
    isStale: boolean;
    refetch: <TPageData>(options?: (import("@tanstack/query-core").RefetchOptions & import("@tanstack/query-core").RefetchQueryFilters<TPageData>) | undefined) => Promise<import("@tanstack/query-core").QueryObserverResult<{
        kind: "signal" | "alert";
        time_field: string;
        schedule: {
            every: string;
            lookback?: string | undefined;
        };
        query: {
            format: "composed";
            base: string;
            breach: {
                segment: string;
            };
            recovery?: {
                segment: string;
            } | undefined;
        } | {
            format: "standalone";
            breach: {
                query: string;
            };
            recovery?: {
                query: string;
            } | undefined;
            no_data?: {
                query: string;
            } | undefined;
        };
        id: string;
        metadata: {
            name: string;
            version: number;
            description?: string | undefined;
            owner?: string | undefined;
            tags?: string[] | undefined;
            builder_type?: string | undefined;
        };
        enabled: boolean;
        createdBy: string | null;
        createdAt: string;
        updatedBy: string | null;
        updatedAt: string;
        recovery_strategy?: "query" | "none" | "no_breach" | undefined;
        no_data_strategy?: "none" | "emit" | "recover" | "last_known_status" | undefined;
        state_transition?: {
            pending_operator?: "AND" | "OR" | undefined;
            pending_count?: number | undefined;
            pending_timeframe?: string | undefined;
            recovering_operator?: "AND" | "OR" | undefined;
            recovering_count?: number | undefined;
            recovering_timeframe?: string | undefined;
        } | null | undefined;
        grouping?: {
            fields: string[];
        } | undefined;
        artifacts?: {
            id: string;
            type: string;
            value: string;
        }[] | undefined;
        version?: string | undefined;
    }, unknown>>;
    remove: () => void;
    fetchStatus: import("@tanstack/query-core").FetchStatus;
} | {
    ruleState: import("./use_fetch_rule").RuleState;
    data: undefined;
    error: null;
    isError: false;
    isLoading: true;
    isLoadingError: false;
    isRefetchError: false;
    isSuccess: false;
    status: "loading";
    dataUpdatedAt: number;
    errorUpdatedAt: number;
    failureCount: number;
    failureReason: unknown;
    errorUpdateCount: number;
    isFetched: boolean;
    isFetchedAfterMount: boolean;
    isFetching: boolean;
    isInitialLoading: boolean;
    isPaused: boolean;
    isPlaceholderData: boolean;
    isPreviousData: boolean;
    isRefetching: boolean;
    isStale: boolean;
    refetch: <TPageData>(options?: (import("@tanstack/query-core").RefetchOptions & import("@tanstack/query-core").RefetchQueryFilters<TPageData>) | undefined) => Promise<import("@tanstack/query-core").QueryObserverResult<{
        kind: "signal" | "alert";
        time_field: string;
        schedule: {
            every: string;
            lookback?: string | undefined;
        };
        query: {
            format: "composed";
            base: string;
            breach: {
                segment: string;
            };
            recovery?: {
                segment: string;
            } | undefined;
        } | {
            format: "standalone";
            breach: {
                query: string;
            };
            recovery?: {
                query: string;
            } | undefined;
            no_data?: {
                query: string;
            } | undefined;
        };
        id: string;
        metadata: {
            name: string;
            version: number;
            description?: string | undefined;
            owner?: string | undefined;
            tags?: string[] | undefined;
            builder_type?: string | undefined;
        };
        enabled: boolean;
        createdBy: string | null;
        createdAt: string;
        updatedBy: string | null;
        updatedAt: string;
        recovery_strategy?: "query" | "none" | "no_breach" | undefined;
        no_data_strategy?: "none" | "emit" | "recover" | "last_known_status" | undefined;
        state_transition?: {
            pending_operator?: "AND" | "OR" | undefined;
            pending_count?: number | undefined;
            pending_timeframe?: string | undefined;
            recovering_operator?: "AND" | "OR" | undefined;
            recovering_count?: number | undefined;
            recovering_timeframe?: string | undefined;
        } | null | undefined;
        grouping?: {
            fields: string[];
        } | undefined;
        artifacts?: {
            id: string;
            type: string;
            value: string;
        }[] | undefined;
        version?: string | undefined;
    }, unknown>>;
    remove: () => void;
    fetchStatus: import("@tanstack/query-core").FetchStatus;
};
