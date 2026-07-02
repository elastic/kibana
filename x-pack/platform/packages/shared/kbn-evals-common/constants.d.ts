export declare const EVALS_INTERNAL_URL: "/internal/evals";
export declare const EVALS_RUNS_URL: "/internal/evals/runs";
export declare const EVALS_RUN_URL: "/internal/evals/runs/{runId}";
export declare const EVALS_RUN_SCORES_URL: "/internal/evals/runs/{runId}/scores";
export declare const EVALS_RUNS_COMPARE_URL: "/internal/evals/runs/compare";
export declare const EVALS_RUN_DATASET_EXAMPLES_URL: "/internal/evals/runs/{runId}/datasets/{datasetId}/examples";
export declare const EVALS_EXAMPLE_SCORES_URL: "/internal/evals/examples/{exampleId}/scores";
export declare const EVALS_TRACE_URL: "/internal/evals/traces/{traceId}";
export declare const EVALS_TRACING_PROJECTS_URL: "/internal/evals/tracing/projects";
export declare const EVALS_TRACING_PROJECT_TRACES_URL: "/internal/evals/tracing/projects/{projectName}/traces";
export declare const EVALS_DATASETS_URL: "/internal/evals/datasets";
export declare const EVALS_DATASET_URL: "/internal/evals/datasets/{datasetId}";
export declare const EVALS_DATASET_EXAMPLES_URL: "/internal/evals/datasets/{datasetId}/examples";
export declare const EVALS_DATASET_EXAMPLE_URL: "/internal/evals/datasets/{datasetId}/examples/{exampleId}";
export declare const EVALS_DATASET_UPSERT_URL: "/internal/evals/datasets/_upsert";
export declare const EVALUATIONS_INDEX_PATTERN: "kibana-evaluations*";
export declare const TRACES_INDEX_PATTERN: "traces-*";
export declare const API_VERSIONS: {
    readonly internal: {
        readonly v1: "1";
    };
};
export declare const INTERNAL_API_ACCESS: "internal";
export declare const DATASET_UUID_NAMESPACE: "f77b3ee3-7bc6-4bf8-9e43-d7fca9e69ae0";
export declare const MAX_EXAMPLES_PER_DATASET: 10000;
export declare const MAX_SCORES_PER_QUERY: 10000;
