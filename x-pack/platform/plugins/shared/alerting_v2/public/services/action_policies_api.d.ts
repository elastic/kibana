import type { HttpStart } from '@kbn/core/public';
import type { CreateActionPolicyData, ActionPolicyResponse, FindActionPoliciesRequest, UpdateActionPolicyBody } from '@kbn/alerting-v2-schemas';
export interface FindActionPoliciesResponse {
    items: ActionPolicyResponse[];
    total: number;
    page: number;
    perPage: number;
}
export declare class ActionPoliciesApi {
    private readonly http;
    constructor(http: HttpStart);
    getActionPolicy(id: string): Promise<{
        id: string;
        name: string;
        description: string;
        enabled: boolean;
        destinations: {
            type: "workflow";
            id: string;
        }[];
        matcher: string | null;
        groupBy: string[] | null;
        tags: string[] | null;
        groupingMode: "all" | "per_episode" | "per_field" | null;
        throttle: {
            interval: string | null;
            strategy?: "on_status_change" | "per_status_interval" | "time_interval" | "every_time" | undefined;
        } | null;
        snoozedUntil: string | null;
        auth: {
            owner: string;
            createdByUser: boolean;
        };
        createdBy: string | null;
        createdAt: string;
        updatedBy: string | null;
        updatedAt: string;
        version?: string | undefined;
    }>;
    listActionPolicies(params?: FindActionPoliciesRequest): Promise<FindActionPoliciesResponse>;
    createActionPolicy(data: CreateActionPolicyData): Promise<{
        id: string;
        name: string;
        description: string;
        enabled: boolean;
        destinations: {
            type: "workflow";
            id: string;
        }[];
        matcher: string | null;
        groupBy: string[] | null;
        tags: string[] | null;
        groupingMode: "all" | "per_episode" | "per_field" | null;
        throttle: {
            interval: string | null;
            strategy?: "on_status_change" | "per_status_interval" | "time_interval" | "every_time" | undefined;
        } | null;
        snoozedUntil: string | null;
        auth: {
            owner: string;
            createdByUser: boolean;
        };
        createdBy: string | null;
        createdAt: string;
        updatedBy: string | null;
        updatedAt: string;
        version?: string | undefined;
    }>;
    upsertActionPolicy(id: string, data: CreateActionPolicyData): Promise<{
        id: string;
        name: string;
        description: string;
        enabled: boolean;
        destinations: {
            type: "workflow";
            id: string;
        }[];
        matcher: string | null;
        groupBy: string[] | null;
        tags: string[] | null;
        groupingMode: "all" | "per_episode" | "per_field" | null;
        throttle: {
            interval: string | null;
            strategy?: "on_status_change" | "per_status_interval" | "time_interval" | "every_time" | undefined;
        } | null;
        snoozedUntil: string | null;
        auth: {
            owner: string;
            createdByUser: boolean;
        };
        createdBy: string | null;
        createdAt: string;
        updatedBy: string | null;
        updatedAt: string;
        version?: string | undefined;
    }>;
    updateActionPolicy(id: string, data: UpdateActionPolicyBody): Promise<{
        id: string;
        name: string;
        description: string;
        enabled: boolean;
        destinations: {
            type: "workflow";
            id: string;
        }[];
        matcher: string | null;
        groupBy: string[] | null;
        tags: string[] | null;
        groupingMode: "all" | "per_episode" | "per_field" | null;
        throttle: {
            interval: string | null;
            strategy?: "on_status_change" | "per_status_interval" | "time_interval" | "every_time" | undefined;
        } | null;
        snoozedUntil: string | null;
        auth: {
            owner: string;
            createdByUser: boolean;
        };
        createdBy: string | null;
        createdAt: string;
        updatedBy: string | null;
        updatedAt: string;
        version?: string | undefined;
    }>;
    deleteActionPolicy(id: string): Promise<void>;
    enableActionPolicy(id: string): Promise<{
        id: string;
        name: string;
        description: string;
        enabled: boolean;
        destinations: {
            type: "workflow";
            id: string;
        }[];
        matcher: string | null;
        groupBy: string[] | null;
        tags: string[] | null;
        groupingMode: "all" | "per_episode" | "per_field" | null;
        throttle: {
            interval: string | null;
            strategy?: "on_status_change" | "per_status_interval" | "time_interval" | "every_time" | undefined;
        } | null;
        snoozedUntil: string | null;
        auth: {
            owner: string;
            createdByUser: boolean;
        };
        createdBy: string | null;
        createdAt: string;
        updatedBy: string | null;
        updatedAt: string;
        version?: string | undefined;
    }>;
    disableActionPolicy(id: string): Promise<{
        id: string;
        name: string;
        description: string;
        enabled: boolean;
        destinations: {
            type: "workflow";
            id: string;
        }[];
        matcher: string | null;
        groupBy: string[] | null;
        tags: string[] | null;
        groupingMode: "all" | "per_episode" | "per_field" | null;
        throttle: {
            interval: string | null;
            strategy?: "on_status_change" | "per_status_interval" | "time_interval" | "every_time" | undefined;
        } | null;
        snoozedUntil: string | null;
        auth: {
            owner: string;
            createdByUser: boolean;
        };
        createdBy: string | null;
        createdAt: string;
        updatedBy: string | null;
        updatedAt: string;
        version?: string | undefined;
    }>;
    snoozeActionPolicy(id: string, snoozedUntil: string): Promise<{
        id: string;
        name: string;
        description: string;
        enabled: boolean;
        destinations: {
            type: "workflow";
            id: string;
        }[];
        matcher: string | null;
        groupBy: string[] | null;
        tags: string[] | null;
        groupingMode: "all" | "per_episode" | "per_field" | null;
        throttle: {
            interval: string | null;
            strategy?: "on_status_change" | "per_status_interval" | "time_interval" | "every_time" | undefined;
        } | null;
        snoozedUntil: string | null;
        auth: {
            owner: string;
            createdByUser: boolean;
        };
        createdBy: string | null;
        createdAt: string;
        updatedBy: string | null;
        updatedAt: string;
        version?: string | undefined;
    }>;
    unsnoozeActionPolicy(id: string): Promise<{
        id: string;
        name: string;
        description: string;
        enabled: boolean;
        destinations: {
            type: "workflow";
            id: string;
        }[];
        matcher: string | null;
        groupBy: string[] | null;
        tags: string[] | null;
        groupingMode: "all" | "per_episode" | "per_field" | null;
        throttle: {
            interval: string | null;
            strategy?: "on_status_change" | "per_status_interval" | "time_interval" | "every_time" | undefined;
        } | null;
        snoozedUntil: string | null;
        auth: {
            owner: string;
            createdByUser: boolean;
        };
        createdBy: string | null;
        createdAt: string;
        updatedBy: string | null;
        updatedAt: string;
        version?: string | undefined;
    }>;
    updateActionPolicyApiKey(id: string): Promise<void>;
    bulkDeleteActionPolicies(ids: string[]): Promise<{
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
    bulkEnableActionPolicies(ids: string[]): Promise<{
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
    bulkDisableActionPolicies(ids: string[]): Promise<{
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
    bulkSnoozeActionPolicies(ids: string[], snoozedUntil: string): Promise<{
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
    bulkUnsnoozeActionPolicies(ids: string[]): Promise<{
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
    bulkUpdateApiKeyActionPolicies(ids: string[]): Promise<{
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
    fetchRuleEventFields(matcher?: string): Promise<string[]>;
    fetchTags(params?: {
        search?: string;
    }): Promise<string[]>;
}
