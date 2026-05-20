export declare const queryKeys: {
    datasets: {
        all: readonly ["evals", "datasets"];
        list: (filters?: {
            page?: number;
            perPage?: number;
        }) => readonly ["evals", "datasets", "list", {
            page?: number;
            perPage?: number;
        } | undefined];
        detail: (datasetId: string) => readonly ["evals", "datasets", "detail", string];
    };
    remotes: {
        all: readonly ["evals", "remotes"];
        list: () => readonly ["evals", "remotes", "list"];
    };
    runs: {
        all: readonly ["evals", "runs"];
        list: (filters?: {
            suiteId?: string;
            modelId?: string;
            branch?: string;
            page?: number;
            perPage?: number;
        }) => readonly ["evals", "runs", "list", {
            suiteId?: string;
            modelId?: string;
            branch?: string;
            page?: number;
            perPage?: number;
        } | undefined];
        detail: (runId: string) => readonly ["evals", "runs", "detail", string];
        scores: (runId: string) => readonly ["evals", "runs", "scores", string];
        datasetExamples: (runId: string, datasetId: string) => readonly ["evals", "runs", "datasets", "examples", string, string];
        compare: (runIdA: string, runIdB: string) => readonly ["evals", "runs", "compare", string, string];
    };
    examples: {
        all: readonly ["evals", "examples"];
        scores: (exampleId: string) => readonly ["evals", "examples", "scores", string];
    };
    traces: {
        all: readonly ["evals", "traces"];
        detail: (traceId: string) => readonly ["evals", "traces", "detail", string];
    };
    tracing: {
        all: readonly ["evals", "tracing"];
        projects: (filters?: {
            from?: string;
            to?: string;
            name?: string;
            page?: number;
            perPage?: number;
        }) => readonly ["evals", "tracing", "projects", {
            from?: string;
            to?: string;
            name?: string;
            page?: number;
            perPage?: number;
        } | undefined];
        projectTraces: (projectName: string, filters?: {
            from?: string;
            to?: string;
            name?: string;
            sortField?: string;
            sortOrder?: string;
            page?: number;
            perPage?: number;
        }) => readonly ["evals", "tracing", "projects", string, "traces", {
            from?: string;
            to?: string;
            name?: string;
            sortField?: string;
            sortOrder?: string;
            page?: number;
            perPage?: number;
        } | undefined];
    };
};
