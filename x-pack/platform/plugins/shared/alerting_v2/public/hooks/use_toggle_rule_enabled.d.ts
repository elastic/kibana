export declare const useToggleRuleEnabled: () => import("@tanstack/react-query").UseMutationResult<{
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
}, unknown, {
    id: string;
    enabled: boolean;
}, unknown>;
