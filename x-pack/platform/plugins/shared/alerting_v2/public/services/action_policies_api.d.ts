import type { HttpStart } from '@kbn/core/public';
import type { BulkActionActionPoliciesBody, CreateActionPolicyData, ActionPolicyResponse, UpdateActionPolicyBody } from '@kbn/alerting-v2-schemas';
export interface BulkActionActionPoliciesResponse {
    processed: number;
    total: number;
    errors: Array<{
        id: string;
        message: string;
    }>;
}
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
        type: "global" | "single_rule";
        ruleId: string | null;
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
    listActionPolicies(params: {
        page?: number;
        perPage?: number;
        search?: string;
        tags?: string[];
        enabled?: boolean;
        sortField?: string;
        sortOrder?: 'asc' | 'desc';
    }): Promise<FindActionPoliciesResponse>;
    createActionPolicy(data: CreateActionPolicyData): Promise<{
        id: string;
        name: string;
        description: string;
        type: "global" | "single_rule";
        ruleId: string | null;
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
        type: "global" | "single_rule";
        ruleId: string | null;
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
        type: "global" | "single_rule";
        ruleId: string | null;
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
        type: "global" | "single_rule";
        ruleId: string | null;
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
        type: "global" | "single_rule";
        ruleId: string | null;
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
        type: "global" | "single_rule";
        ruleId: string | null;
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
    bulkActionActionPolicies(body: BulkActionActionPoliciesBody): Promise<BulkActionActionPoliciesResponse>;
    fetchDataFields(matcher?: string): Promise<string[]>;
    fetchTags(params?: {
        search?: string;
    }): Promise<string[]>;
}
