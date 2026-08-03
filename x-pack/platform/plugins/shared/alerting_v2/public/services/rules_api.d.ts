import type { HttpStart } from '@kbn/core/public';
import type { BulkByIdsParams, BulkByQueryParams, BulkByQueryResult, BulkResponse, CreateRuleData, DryRunResponse, FindRulesRequest, FindRulesResponse, RuleResponse, UpdateRuleData } from '@kbn/alerting-v2-schemas';
/** Re-exported from the shared schemas package. */
export type { RuleResponse as RuleApiResponse, FindRulesResponse };
export type { BulkByIdsParams, BulkByQueryParams, BulkByQueryResult, BulkResponse, DryRunResponse };
export declare class RulesApi {
    private readonly http;
    constructor(http: HttpStart);
    listTags(params?: {
        filter?: string;
    }): Promise<{
        tags: string[];
    }>;
    listRules(params?: FindRulesRequest): Promise<{
        items: {
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
        }[];
        total: number;
        page: number;
        perPage: number;
    }>;
    createRule(payload: CreateRuleData): Promise<{
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
    }>;
    upsertRule(id: string, payload: CreateRuleData): Promise<{
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
    }>;
    getRule(id: string, signal?: AbortSignal): Promise<{
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
    }>;
    updateRule(id: string, payload: UpdateRuleData): Promise<{
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
    }>;
    deleteRule(id: string): Promise<{
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
    }>;
    enableRule(id: string): Promise<{
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
    }>;
    disableRule(id: string): Promise<{
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
    }>;
    runRule(id: string): Promise<void>;
    bulkDeleteRules(params: BulkByIdsParams): Promise<{
        affected_count: number;
        errors: {
            id: string;
            error: {
                message: string;
                code: string;
                details?: Record<string, unknown> | undefined;
            };
        }[];
    }>;
    bulkEnableRules(params: BulkByIdsParams): Promise<{
        affected_count: number;
        errors: {
            id: string;
            error: {
                message: string;
                code: string;
                details?: Record<string, unknown> | undefined;
            };
        }[];
    }>;
    bulkDisableRules(params: BulkByIdsParams): Promise<{
        affected_count: number;
        errors: {
            id: string;
            error: {
                message: string;
                code: string;
                details?: Record<string, unknown> | undefined;
            };
        }[];
    }>;
    deleteRulesByQuery(params: BulkByQueryParams & {
        force: true;
    }): Promise<BulkResponse>;
    deleteRulesByQuery(params: BulkByQueryParams): Promise<BulkByQueryResult>;
    enableRulesByQuery(params: BulkByQueryParams & {
        force: true;
    }): Promise<BulkResponse>;
    enableRulesByQuery(params: BulkByQueryParams): Promise<BulkByQueryResult>;
    disableRulesByQuery(params: BulkByQueryParams & {
        force: true;
    }): Promise<BulkResponse>;
    disableRulesByQuery(params: BulkByQueryParams): Promise<BulkByQueryResult>;
}
