import type { WorkflowsSearchParams } from '@kbn/workflows';
import type { PolicyExecutionOutcomeFilter } from '@kbn/alerting-v2-schemas';
import type { ListRuleExecutionsUiParams } from './use_fetch_rule_executions';
export declare const ruleKeys: {
    all: readonly ["rule"];
    lists: () => readonly ["rule", "list"];
    list: (filters: {
        page: number;
        perPage: number;
        filter?: string;
        search?: string;
        sortField?: string;
        sortOrder?: "asc" | "desc";
    }) => readonly ["rule", "list", {
        page: number;
        perPage: number;
        filter?: string;
        search?: string;
        sortField?: string;
        sortOrder?: "asc" | "desc";
    }];
    details: () => readonly ["rule", "details"];
    detail: (id: string) => readonly ["rule", "details", string];
    tags: (filter?: string) => readonly ["rule", "tags", {
        readonly filter: string | undefined;
    }];
};
export declare const workflowKeys: {
    all: readonly ["workflow"];
    details: () => readonly ["workflow", "details"];
    detail: (id: string) => readonly ["workflow", "details", string];
    searches: () => readonly ["workflow", "search"];
    search: (params: Pick<WorkflowsSearchParams, "query" | "tags">) => readonly ["workflow", "search", Pick<WorkflowsSearchParams, "query" | "tags">];
};
export declare const matcherSuggestionKeys: {
    all: readonly ["matcherSuggestions"];
    ruleEventFields: (matcher?: string) => readonly ["matcherSuggestions", "ruleEventFields", {
        readonly matcher: string | undefined;
    }];
};
export declare const actionPolicyKeys: {
    all: readonly ["actionPolicy"];
    detail: (id: string) => readonly ["actionPolicy", "detail", string];
    lists: () => readonly ["actionPolicy", "list"];
    list: (filters: {
        page: number;
        perPage: number;
        search?: string;
        tags?: string[];
        enabled?: boolean;
        sortField?: string;
        sortOrder?: "asc" | "desc";
    }) => readonly ["actionPolicy", "list", {
        page: number;
        perPage: number;
        search?: string;
        tags?: string[];
        enabled?: boolean;
        sortField?: string;
        sortOrder?: "asc" | "desc";
    }];
    allTags: () => readonly ["actionPolicy", "tags"];
    tags: (search?: string) => readonly ["actionPolicy", "tags", {
        readonly search: string | undefined;
    }];
    linkedForRule: (ruleId: string) => readonly ["actionPolicy", "list", "linkedForRule", string];
};
export declare const executionHistoryKeys: {
    all: readonly ["executionHistory"];
    list: (filters: {
        page: number;
        perPage: number;
        search?: string;
        ruleIds?: string[];
        outcome?: PolicyExecutionOutcomeFilter;
        episodeIds?: string[];
        startDate?: string;
    }) => readonly ["executionHistory", "list", {
        page: number;
        perPage: number;
        search?: string;
        ruleIds?: string[];
        outcome?: PolicyExecutionOutcomeFilter;
        episodeIds?: string[];
        startDate?: string;
    }];
    newEventsSince: (since: string, filters?: {
        search?: string;
        ruleIds?: string[];
        outcome?: PolicyExecutionOutcomeFilter;
    }) => readonly ["executionHistory", "newEventsSince", string, {
        search?: string;
        ruleIds?: string[];
        outcome?: PolicyExecutionOutcomeFilter;
    }];
};
export declare const ruleExecutionKeys: {
    all: readonly ["ruleExecution"];
    list: (filters: ListRuleExecutionsUiParams) => readonly ["ruleExecution", "list", ListRuleExecutionsUiParams];
};
export declare const userProfileKeys: {
    all: readonly ["userProfile"];
    bulk: (uids: string[]) => readonly ["userProfile", "bulk", string[]];
};
