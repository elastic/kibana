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
    tags: () => readonly ["rule", "tags"];
};
export declare const workflowKeys: {
    all: readonly ["workflow"];
    details: () => readonly ["workflow", "details"];
    detail: (id: string) => readonly ["workflow", "details", string];
    searches: () => readonly ["workflow", "search"];
    search: (params: {
        query: string;
    }) => readonly ["workflow", "search", {
        query: string;
    }];
};
export declare const matcherSuggestionKeys: {
    all: readonly ["matcherSuggestions"];
    dataFields: (matcher?: string) => readonly ["matcherSuggestions", "dataFields", {
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
};
export declare const executionHistoryKeys: {
    all: readonly ["executionHistory"];
    list: (filters: {
        page: number;
        perPage: number;
    }) => readonly ["executionHistory", "list", {
        page: number;
        perPage: number;
    }];
    countSince: (since: string) => readonly ["executionHistory", "countSince", string];
};
export declare const userProfileKeys: {
    all: readonly ["userProfile"];
    bulk: (uids: string[]) => readonly ["userProfile", "bulk", string[]];
};
