export declare const queryKeys: {
    datasets: {
        all: readonly ["evals", "datasets"];
        list: (filters?: {
            page?: number;
            perPage?: number;
            search?: string;
            sortField?: string;
            sortOrder?: string;
        }) => readonly ["evals", "datasets", "list", {
            page?: number;
            perPage?: number;
            search?: string;
            sortField?: string;
            sortOrder?: string;
        } | undefined];
        detail: (datasetId: string) => readonly ["evals", "datasets", "detail", string];
    };
    remotes: {
        all: readonly ["evals", "remotes"];
        list: () => readonly ["evals", "remotes", "list"];
    };
    experiments: {
        all: readonly ["evals", "experiments"];
        list: (filters?: {
            suiteId?: string;
            modelId?: string;
            branch?: string;
            buildId?: string;
            page?: number;
            perPage?: number;
        }) => readonly ["evals", "experiments", "list", {
            suiteId?: string;
            modelId?: string;
            branch?: string;
            buildId?: string;
            page?: number;
            perPage?: number;
        } | undefined];
        detail: (experimentId: string, executionId?: string) => readonly ["evals", "experiments", "detail", string, string | undefined];
        scores: (experimentId: string, executionId?: string) => readonly ["evals", "experiments", "scores", string, string | undefined];
        datasetExamples: (experimentId: string, datasetId: string, executionId?: string) => readonly ["evals", "experiments", "datasets", "examples", string, string, string | undefined];
        compare: (type: string, baselineId: string, targetId: string) => readonly ["evals", "experiments", "compare", string, string, string];
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
