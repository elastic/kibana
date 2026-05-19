import type { HttpStart } from '@kbn/core/public';
import type { BulkOperationParams, BulkOperationResponse, CreateRuleData, FindRulesResponse, FindRulesSortField, RuleResponse, UpdateRuleData } from '@kbn/alerting-v2-schemas';
/** Re-exported from the shared schemas package. */
export type { RuleResponse as RuleApiResponse, FindRulesResponse };
export interface ListRulesParams {
    page?: number;
    perPage?: number;
    filter?: string;
    search?: string;
    sortField?: FindRulesSortField;
    sortOrder?: 'asc' | 'desc';
}
export type { BulkOperationParams, BulkOperationResponse };
export declare class RulesApi {
    private readonly http;
    constructor(http: HttpStart);
    listTags(): Promise<{
        tags: string[];
    }>;
    listRules(params: ListRulesParams): Promise<{
        items: {
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
        total: number;
        page: number;
        perPage: number;
    }>;
    createRule(payload: CreateRuleData): Promise<{
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
    }>;
    getRule(id: string): Promise<{
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
    }>;
    updateRule(id: string, payload: UpdateRuleData): Promise<{
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
    }>;
    deleteRule(id: string): Promise<{
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
    }>;
    bulkDeleteRules(params: BulkOperationParams): Promise<{
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
    }>;
    bulkEnableRules(params: BulkOperationParams): Promise<{
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
    }>;
    bulkDisableRules(params: BulkOperationParams): Promise<{
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
    }>;
}
