import type { HttpStart, NotificationsStart } from '@kbn/core/public';
import type { FormValues } from '../types';
interface UseUpdateRuleProps {
    http: HttpStart;
    notifications: NotificationsStart;
    ruleId: string;
}
export declare const useUpdateRule: ({ http, notifications, ruleId }: UseUpdateRuleProps) => {
    updateRule: import("@kbn/react-query").UseMutateFunction<{
        kind: "alert" | "signal";
        metadata: {
            name: string;
            description?: string | undefined;
            owner?: string | undefined;
            tags?: string[] | undefined;
        };
        time_field: string;
        schedule: {
            every: string;
            lookback?: string | undefined;
        };
        evaluation: {
            query: {
                base: string;
            };
        };
        id: string;
        enabled: boolean;
        createdBy: string | null;
        createdAt: string;
        updatedBy: string | null;
        updatedAt: string;
        recovery_policy?: {
            type: "query" | "no_breach";
            query?: {
                base?: string | undefined;
            } | undefined;
        } | undefined;
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
        no_data?: {
            behavior?: "recover" | "no_data" | "last_status" | undefined;
            timeframe?: string | undefined;
        } | undefined;
        artifacts?: {
            id: string;
            type: string;
            value: string;
        }[] | undefined;
    }, Error, FormValues, unknown>;
    data: undefined;
    error: null;
    isError: false;
    isIdle: true;
    isLoading: false;
    isSuccess: false;
    status: "idle";
    mutate: import("@kbn/react-query").UseMutateFunction<{
        kind: "alert" | "signal";
        metadata: {
            name: string;
            description?: string | undefined;
            owner?: string | undefined;
            tags?: string[] | undefined;
        };
        time_field: string;
        schedule: {
            every: string;
            lookback?: string | undefined;
        };
        evaluation: {
            query: {
                base: string;
            };
        };
        id: string;
        enabled: boolean;
        createdBy: string | null;
        createdAt: string;
        updatedBy: string | null;
        updatedAt: string;
        recovery_policy?: {
            type: "query" | "no_breach";
            query?: {
                base?: string | undefined;
            } | undefined;
        } | undefined;
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
        no_data?: {
            behavior?: "recover" | "no_data" | "last_status" | undefined;
            timeframe?: string | undefined;
        } | undefined;
        artifacts?: {
            id: string;
            type: string;
            value: string;
        }[] | undefined;
    }, Error, FormValues, unknown>;
    reset: () => void;
    context: unknown;
    failureCount: number;
    failureReason: Error | null;
    isPaused: boolean;
    variables: FormValues | undefined;
    mutateAsync: import("@kbn/react-query").UseMutateAsyncFunction<{
        kind: "alert" | "signal";
        metadata: {
            name: string;
            description?: string | undefined;
            owner?: string | undefined;
            tags?: string[] | undefined;
        };
        time_field: string;
        schedule: {
            every: string;
            lookback?: string | undefined;
        };
        evaluation: {
            query: {
                base: string;
            };
        };
        id: string;
        enabled: boolean;
        createdBy: string | null;
        createdAt: string;
        updatedBy: string | null;
        updatedAt: string;
        recovery_policy?: {
            type: "query" | "no_breach";
            query?: {
                base?: string | undefined;
            } | undefined;
        } | undefined;
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
        no_data?: {
            behavior?: "recover" | "no_data" | "last_status" | undefined;
            timeframe?: string | undefined;
        } | undefined;
        artifacts?: {
            id: string;
            type: string;
            value: string;
        }[] | undefined;
    }, Error, FormValues, unknown>;
} | {
    updateRule: import("@kbn/react-query").UseMutateFunction<{
        kind: "alert" | "signal";
        metadata: {
            name: string;
            description?: string | undefined;
            owner?: string | undefined;
            tags?: string[] | undefined;
        };
        time_field: string;
        schedule: {
            every: string;
            lookback?: string | undefined;
        };
        evaluation: {
            query: {
                base: string;
            };
        };
        id: string;
        enabled: boolean;
        createdBy: string | null;
        createdAt: string;
        updatedBy: string | null;
        updatedAt: string;
        recovery_policy?: {
            type: "query" | "no_breach";
            query?: {
                base?: string | undefined;
            } | undefined;
        } | undefined;
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
        no_data?: {
            behavior?: "recover" | "no_data" | "last_status" | undefined;
            timeframe?: string | undefined;
        } | undefined;
        artifacts?: {
            id: string;
            type: string;
            value: string;
        }[] | undefined;
    }, Error, FormValues, unknown>;
    data: undefined;
    error: null;
    isError: false;
    isIdle: false;
    isLoading: true;
    isSuccess: false;
    status: "loading";
    mutate: import("@kbn/react-query").UseMutateFunction<{
        kind: "alert" | "signal";
        metadata: {
            name: string;
            description?: string | undefined;
            owner?: string | undefined;
            tags?: string[] | undefined;
        };
        time_field: string;
        schedule: {
            every: string;
            lookback?: string | undefined;
        };
        evaluation: {
            query: {
                base: string;
            };
        };
        id: string;
        enabled: boolean;
        createdBy: string | null;
        createdAt: string;
        updatedBy: string | null;
        updatedAt: string;
        recovery_policy?: {
            type: "query" | "no_breach";
            query?: {
                base?: string | undefined;
            } | undefined;
        } | undefined;
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
        no_data?: {
            behavior?: "recover" | "no_data" | "last_status" | undefined;
            timeframe?: string | undefined;
        } | undefined;
        artifacts?: {
            id: string;
            type: string;
            value: string;
        }[] | undefined;
    }, Error, FormValues, unknown>;
    reset: () => void;
    context: unknown;
    failureCount: number;
    failureReason: Error | null;
    isPaused: boolean;
    variables: FormValues | undefined;
    mutateAsync: import("@kbn/react-query").UseMutateAsyncFunction<{
        kind: "alert" | "signal";
        metadata: {
            name: string;
            description?: string | undefined;
            owner?: string | undefined;
            tags?: string[] | undefined;
        };
        time_field: string;
        schedule: {
            every: string;
            lookback?: string | undefined;
        };
        evaluation: {
            query: {
                base: string;
            };
        };
        id: string;
        enabled: boolean;
        createdBy: string | null;
        createdAt: string;
        updatedBy: string | null;
        updatedAt: string;
        recovery_policy?: {
            type: "query" | "no_breach";
            query?: {
                base?: string | undefined;
            } | undefined;
        } | undefined;
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
        no_data?: {
            behavior?: "recover" | "no_data" | "last_status" | undefined;
            timeframe?: string | undefined;
        } | undefined;
        artifacts?: {
            id: string;
            type: string;
            value: string;
        }[] | undefined;
    }, Error, FormValues, unknown>;
} | {
    updateRule: import("@kbn/react-query").UseMutateFunction<{
        kind: "alert" | "signal";
        metadata: {
            name: string;
            description?: string | undefined;
            owner?: string | undefined;
            tags?: string[] | undefined;
        };
        time_field: string;
        schedule: {
            every: string;
            lookback?: string | undefined;
        };
        evaluation: {
            query: {
                base: string;
            };
        };
        id: string;
        enabled: boolean;
        createdBy: string | null;
        createdAt: string;
        updatedBy: string | null;
        updatedAt: string;
        recovery_policy?: {
            type: "query" | "no_breach";
            query?: {
                base?: string | undefined;
            } | undefined;
        } | undefined;
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
        no_data?: {
            behavior?: "recover" | "no_data" | "last_status" | undefined;
            timeframe?: string | undefined;
        } | undefined;
        artifacts?: {
            id: string;
            type: string;
            value: string;
        }[] | undefined;
    }, Error, FormValues, unknown>;
    data: undefined;
    error: Error;
    isError: true;
    isIdle: false;
    isLoading: false;
    isSuccess: false;
    status: "error";
    mutate: import("@kbn/react-query").UseMutateFunction<{
        kind: "alert" | "signal";
        metadata: {
            name: string;
            description?: string | undefined;
            owner?: string | undefined;
            tags?: string[] | undefined;
        };
        time_field: string;
        schedule: {
            every: string;
            lookback?: string | undefined;
        };
        evaluation: {
            query: {
                base: string;
            };
        };
        id: string;
        enabled: boolean;
        createdBy: string | null;
        createdAt: string;
        updatedBy: string | null;
        updatedAt: string;
        recovery_policy?: {
            type: "query" | "no_breach";
            query?: {
                base?: string | undefined;
            } | undefined;
        } | undefined;
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
        no_data?: {
            behavior?: "recover" | "no_data" | "last_status" | undefined;
            timeframe?: string | undefined;
        } | undefined;
        artifacts?: {
            id: string;
            type: string;
            value: string;
        }[] | undefined;
    }, Error, FormValues, unknown>;
    reset: () => void;
    context: unknown;
    failureCount: number;
    failureReason: Error | null;
    isPaused: boolean;
    variables: FormValues | undefined;
    mutateAsync: import("@kbn/react-query").UseMutateAsyncFunction<{
        kind: "alert" | "signal";
        metadata: {
            name: string;
            description?: string | undefined;
            owner?: string | undefined;
            tags?: string[] | undefined;
        };
        time_field: string;
        schedule: {
            every: string;
            lookback?: string | undefined;
        };
        evaluation: {
            query: {
                base: string;
            };
        };
        id: string;
        enabled: boolean;
        createdBy: string | null;
        createdAt: string;
        updatedBy: string | null;
        updatedAt: string;
        recovery_policy?: {
            type: "query" | "no_breach";
            query?: {
                base?: string | undefined;
            } | undefined;
        } | undefined;
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
        no_data?: {
            behavior?: "recover" | "no_data" | "last_status" | undefined;
            timeframe?: string | undefined;
        } | undefined;
        artifacts?: {
            id: string;
            type: string;
            value: string;
        }[] | undefined;
    }, Error, FormValues, unknown>;
} | {
    updateRule: import("@kbn/react-query").UseMutateFunction<{
        kind: "alert" | "signal";
        metadata: {
            name: string;
            description?: string | undefined;
            owner?: string | undefined;
            tags?: string[] | undefined;
        };
        time_field: string;
        schedule: {
            every: string;
            lookback?: string | undefined;
        };
        evaluation: {
            query: {
                base: string;
            };
        };
        id: string;
        enabled: boolean;
        createdBy: string | null;
        createdAt: string;
        updatedBy: string | null;
        updatedAt: string;
        recovery_policy?: {
            type: "query" | "no_breach";
            query?: {
                base?: string | undefined;
            } | undefined;
        } | undefined;
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
        no_data?: {
            behavior?: "recover" | "no_data" | "last_status" | undefined;
            timeframe?: string | undefined;
        } | undefined;
        artifacts?: {
            id: string;
            type: string;
            value: string;
        }[] | undefined;
    }, Error, FormValues, unknown>;
    data: {
        kind: "alert" | "signal";
        metadata: {
            name: string;
            description?: string | undefined;
            owner?: string | undefined;
            tags?: string[] | undefined;
        };
        time_field: string;
        schedule: {
            every: string;
            lookback?: string | undefined;
        };
        evaluation: {
            query: {
                base: string;
            };
        };
        id: string;
        enabled: boolean;
        createdBy: string | null;
        createdAt: string;
        updatedBy: string | null;
        updatedAt: string;
        recovery_policy?: {
            type: "query" | "no_breach";
            query?: {
                base?: string | undefined;
            } | undefined;
        } | undefined;
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
        no_data?: {
            behavior?: "recover" | "no_data" | "last_status" | undefined;
            timeframe?: string | undefined;
        } | undefined;
        artifacts?: {
            id: string;
            type: string;
            value: string;
        }[] | undefined;
    };
    error: null;
    isError: false;
    isIdle: false;
    isLoading: false;
    isSuccess: true;
    status: "success";
    mutate: import("@kbn/react-query").UseMutateFunction<{
        kind: "alert" | "signal";
        metadata: {
            name: string;
            description?: string | undefined;
            owner?: string | undefined;
            tags?: string[] | undefined;
        };
        time_field: string;
        schedule: {
            every: string;
            lookback?: string | undefined;
        };
        evaluation: {
            query: {
                base: string;
            };
        };
        id: string;
        enabled: boolean;
        createdBy: string | null;
        createdAt: string;
        updatedBy: string | null;
        updatedAt: string;
        recovery_policy?: {
            type: "query" | "no_breach";
            query?: {
                base?: string | undefined;
            } | undefined;
        } | undefined;
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
        no_data?: {
            behavior?: "recover" | "no_data" | "last_status" | undefined;
            timeframe?: string | undefined;
        } | undefined;
        artifacts?: {
            id: string;
            type: string;
            value: string;
        }[] | undefined;
    }, Error, FormValues, unknown>;
    reset: () => void;
    context: unknown;
    failureCount: number;
    failureReason: Error | null;
    isPaused: boolean;
    variables: FormValues | undefined;
    mutateAsync: import("@kbn/react-query").UseMutateAsyncFunction<{
        kind: "alert" | "signal";
        metadata: {
            name: string;
            description?: string | undefined;
            owner?: string | undefined;
            tags?: string[] | undefined;
        };
        time_field: string;
        schedule: {
            every: string;
            lookback?: string | undefined;
        };
        evaluation: {
            query: {
                base: string;
            };
        };
        id: string;
        enabled: boolean;
        createdBy: string | null;
        createdAt: string;
        updatedBy: string | null;
        updatedAt: string;
        recovery_policy?: {
            type: "query" | "no_breach";
            query?: {
                base?: string | undefined;
            } | undefined;
        } | undefined;
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
        no_data?: {
            behavior?: "recover" | "no_data" | "last_status" | undefined;
            timeframe?: string | undefined;
        } | undefined;
        artifacts?: {
            id: string;
            type: string;
            value: string;
        }[] | undefined;
    }, Error, FormValues, unknown>;
};
export {};
