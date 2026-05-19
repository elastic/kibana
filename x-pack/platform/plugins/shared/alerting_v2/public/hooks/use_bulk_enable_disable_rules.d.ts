export declare const useBulkEnableRules: () => import("@kbn/react-query").UseMutationResult<{
    rules: {
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
    }[];
    errors: {
        id: string;
        error: {
            message: string;
            statusCode: number;
        };
    }[];
    truncated?: boolean | undefined;
    totalMatched?: number | undefined;
}, unknown, {
    ids?: string[] | undefined;
    filter?: string | undefined;
    search?: string | undefined;
    match_all?: true | undefined;
}, unknown>;
export declare const useBulkDisableRules: () => import("@kbn/react-query").UseMutationResult<{
    rules: {
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
    }[];
    errors: {
        id: string;
        error: {
            message: string;
            statusCode: number;
        };
    }[];
    truncated?: boolean | undefined;
    totalMatched?: number | undefined;
}, unknown, {
    ids?: string[] | undefined;
    filter?: string | undefined;
    search?: string | undefined;
    match_all?: true | undefined;
}, unknown>;
