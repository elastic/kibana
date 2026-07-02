import type { TraceFetcher } from '@kbn/llm-trace-waterfall';
import { type UpdateEvaluationDatasetRequestBodyInput, type AddEvaluationDatasetExamplesRequestBodyInput, type UpdateEvaluationDatasetExampleRequestBodyInput } from '@kbn/evals-common';
export interface EvalsRemoteSummary {
    id: string;
    displayName: string;
    url: string;
}
export interface GetEvalsRemotesResponse {
    remotes: EvalsRemoteSummary[];
}
interface RunsListFilters {
    suiteId?: string;
    modelId?: string;
    branch?: string;
    datasetId?: string;
    page?: number;
    perPage?: number;
}
interface DatasetsListFilters {
    page?: number;
    perPage?: number;
}
interface DatasetWithId {
    datasetId: string;
}
interface UpdateDatasetVariables extends DatasetWithId {
    updates: UpdateEvaluationDatasetRequestBodyInput;
}
interface AddExamplesVariables extends DatasetWithId {
    body: AddEvaluationDatasetExamplesRequestBodyInput;
}
interface ExampleWithDatasetId extends DatasetWithId {
    exampleId: string;
}
interface UpdateExampleVariables extends ExampleWithDatasetId {
    updates: UpdateEvaluationDatasetExampleRequestBodyInput;
}
export declare const useDatasets: (filters?: DatasetsListFilters) => import("@kbn/react-query").UseQueryResult<{
    datasets: {
        id: string;
        name: string;
        description: string;
        examples_count: number;
        created_at: string;
        updated_at: string;
    }[];
    total: number;
}, unknown>;
export declare const useDataset: (datasetId: string) => import("@kbn/react-query").UseQueryResult<{
    id: string;
    name: string;
    description: string;
    examples: {
        id: string;
        created_at: string;
        updated_at: string;
        input?: {
            [x: string]: unknown;
        } | undefined;
        output?: {
            [x: string]: unknown;
        } | undefined;
        metadata?: {
            [x: string]: unknown;
        } | undefined;
    }[];
    created_at: string;
    updated_at: string;
}, unknown>;
export declare const useCreateDataset: () => import("@kbn/react-query").UseMutationResult<{
    dataset_id: string;
    name: string;
}, unknown, {
    name: string;
    description: string;
}, unknown>;
export declare const useUpdateDataset: () => import("@kbn/react-query").UseMutationResult<{
    id: string;
    name: string;
    description: string;
    created_at: string;
    updated_at: string;
}, unknown, UpdateDatasetVariables, unknown>;
export declare const useDeleteDataset: () => import("@kbn/react-query").UseMutationResult<{
    success: boolean;
}, unknown, DatasetWithId, unknown>;
export declare const useAddExamples: () => import("@kbn/react-query").UseMutationResult<{
    added: number;
}, unknown, AddExamplesVariables, unknown>;
export declare const useUpdateExample: () => import("@kbn/react-query").UseMutationResult<{
    id: string;
    dataset_id: string;
    created_at: string;
    updated_at: string;
    input?: {
        [x: string]: unknown;
    } | undefined;
    output?: {
        [x: string]: unknown;
    } | undefined;
    metadata?: {
        [x: string]: unknown;
    } | undefined;
}, unknown, UpdateExampleVariables, unknown>;
export declare const useDeleteExample: () => import("@kbn/react-query").UseMutationResult<{
    success: boolean;
}, unknown, ExampleWithDatasetId, unknown>;
export declare const useRemotes: () => import("@kbn/react-query").UseQueryResult<GetEvalsRemotesResponse, unknown>;
export declare const useCreateRemote: () => import("@kbn/react-query").UseMutationResult<EvalsRemoteSummary, unknown, {
    displayName: string;
    url: string;
    apiKey: string;
}, unknown>;
export declare const useUpdateRemote: () => import("@kbn/react-query").UseMutationResult<EvalsRemoteSummary, unknown, {
    remoteId: string;
    updates: {
        displayName?: string;
        url?: string;
        apiKey?: string;
    };
}, unknown>;
export declare const useTestRemoteConnection: () => import("@kbn/react-query").UseMutationResult<{
    success: boolean;
    statusCode: number;
    message?: string;
}, unknown, {
    url?: string;
    apiKey?: string;
    remoteId?: string;
}, unknown>;
export declare const useDeleteRemote: () => import("@kbn/react-query").UseMutationResult<{
    deleted: boolean;
}, unknown, string, unknown>;
export declare const useEvaluationRuns: (filters?: RunsListFilters) => import("@kbn/react-query").UseQueryResult<{
    runs: {
        run_id: string;
        timestamp: string;
        suite_id?: string | undefined;
        dataset_id?: string | null | undefined;
        dataset_name?: string | null | undefined;
        task_model?: {
            id: string;
            family?: string | undefined;
            provider?: string | undefined;
        } | undefined;
        evaluator_model?: {
            id: string;
            family?: string | undefined;
            provider?: string | undefined;
        } | undefined;
        git_branch?: string | null | undefined;
        git_commit_sha?: string | null | undefined;
        total_repetitions?: number | undefined;
        ci?: {
            build_id?: string | undefined;
            job_id?: string | undefined;
            build_url?: string | undefined;
            pipeline_slug?: string | undefined;
            pull_request?: string | undefined;
            branch?: string | undefined;
            commit?: string | undefined;
        } | undefined;
    }[];
    total: number;
}, unknown>;
export declare const useEvaluationRun: (runId: string) => import("@kbn/react-query").UseQueryResult<{
    run_id: string;
    stats: {
        dataset_id: string;
        dataset_name: string;
        evaluator_name: string;
        stats: {
            mean: number;
            median: number;
            std_dev: number;
            min: number;
            max: number;
            count: number;
        };
    }[];
    timestamp?: string | undefined;
    task_model?: {
        id: string;
        family?: string | undefined;
        provider?: string | undefined;
    } | undefined;
    evaluator_model?: {
        id: string;
        family?: string | undefined;
        provider?: string | undefined;
    } | undefined;
    git_branch?: string | null | undefined;
    git_commit_sha?: string | null | undefined;
    ci?: {
        build_id?: string | undefined;
        job_id?: string | undefined;
        build_url?: string | undefined;
        pipeline_slug?: string | undefined;
        pull_request?: string | undefined;
        branch?: string | undefined;
        commit?: string | undefined;
    } | undefined;
    total_repetitions?: number | undefined;
}, unknown>;
export declare const useEvaluationRunScores: (runId: string) => import("@kbn/react-query").UseQueryResult<{
    scores: {
        '@timestamp': string;
        run_id: string;
        experiment_id: string;
        example: {
            id: string;
            index: number;
            dataset: {
                id: string;
                name: string;
            };
            input?: {
                [x: string]: unknown;
            } | null | undefined;
        };
        task: {
            repetition_index: number;
            model: {
                id: string;
                family?: string | undefined;
                provider?: string | undefined;
            };
            trace_id?: string | null | undefined;
            output?: {
                [x: string]: unknown;
            } | null | undefined;
        };
        evaluator: {
            name: string;
            model: {
                id: string;
                family?: string | undefined;
                provider?: string | undefined;
            };
            score?: number | null | undefined;
            label?: string | null | undefined;
            explanation?: string | null | undefined;
            metadata?: {
                [x: string]: unknown;
            } | null | undefined;
            trace_id?: string | null | undefined;
        };
        run_metadata: {
            total_repetitions: number;
            git_branch?: string | null | undefined;
            git_commit_sha?: string | null | undefined;
        };
        environment: {
            hostname?: string | undefined;
        };
        suite?: {
            id?: string | undefined;
        } | undefined;
        ci?: {
            buildkite?: {
                build_id?: string | undefined;
                job_id?: string | undefined;
                build_url?: string | undefined;
                pipeline_slug?: string | undefined;
                pull_request?: string | undefined;
                branch?: string | undefined;
                commit?: string | undefined;
            } | undefined;
        } | undefined;
    }[];
    total: number;
}, unknown>;
export declare const useCompareRuns: (runIdA: string, runIdB: string) => import("@kbn/react-query").UseQueryResult<{
    results: {
        datasetId: string;
        datasetName: string;
        evaluatorName: string;
        sampleSize: number;
        meanA: number;
        meanB: number;
        pValue: number | null;
    }[];
    pairing: {
        totalPairs: number;
        skippedMissingPairs: number;
        skippedNullScores: number;
        truncatedA: boolean;
        truncatedB: boolean;
    };
}, unknown>;
export declare const useRunDatasetExamples: (runId: string, datasetId: string) => import("@kbn/react-query").UseQueryResult<{
    examples: {
        example_id: string;
        example_index: number | null;
        scores: {
            '@timestamp': string;
            run_id: string;
            experiment_id: string;
            example: {
                id: string;
                index: number;
                dataset: {
                    id: string;
                    name: string;
                };
                input?: {
                    [x: string]: unknown;
                } | null | undefined;
            };
            task: {
                repetition_index: number;
                model: {
                    id: string;
                    family?: string | undefined;
                    provider?: string | undefined;
                };
                trace_id?: string | null | undefined;
                output?: {
                    [x: string]: unknown;
                } | null | undefined;
            };
            evaluator: {
                name: string;
                model: {
                    id: string;
                    family?: string | undefined;
                    provider?: string | undefined;
                };
                score?: number | null | undefined;
                label?: string | null | undefined;
                explanation?: string | null | undefined;
                metadata?: {
                    [x: string]: unknown;
                } | null | undefined;
                trace_id?: string | null | undefined;
            };
            run_metadata: {
                total_repetitions: number;
                git_branch?: string | null | undefined;
                git_commit_sha?: string | null | undefined;
            };
            environment: {
                hostname?: string | undefined;
            };
            suite?: {
                id?: string | undefined;
            } | undefined;
            ci?: {
                buildkite?: {
                    build_id?: string | undefined;
                    job_id?: string | undefined;
                    build_url?: string | undefined;
                    pipeline_slug?: string | undefined;
                    pull_request?: string | undefined;
                    branch?: string | undefined;
                    commit?: string | undefined;
                } | undefined;
            } | undefined;
        }[];
    }[];
}, unknown>;
export declare const useExampleScores: (exampleId: string) => import("@kbn/react-query").UseQueryResult<{
    scores: {
        '@timestamp': string;
        run_id: string;
        experiment_id: string;
        example: {
            id: string;
            index: number;
            dataset: {
                id: string;
                name: string;
            };
            input?: {
                [x: string]: unknown;
            } | null | undefined;
        };
        task: {
            repetition_index: number;
            model: {
                id: string;
                family?: string | undefined;
                provider?: string | undefined;
            };
            trace_id?: string | null | undefined;
            output?: {
                [x: string]: unknown;
            } | null | undefined;
        };
        evaluator: {
            name: string;
            model: {
                id: string;
                family?: string | undefined;
                provider?: string | undefined;
            };
            score?: number | null | undefined;
            label?: string | null | undefined;
            explanation?: string | null | undefined;
            metadata?: {
                [x: string]: unknown;
            } | null | undefined;
            trace_id?: string | null | undefined;
        };
        run_metadata: {
            total_repetitions: number;
            git_branch?: string | null | undefined;
            git_commit_sha?: string | null | undefined;
        };
        environment: {
            hostname?: string | undefined;
        };
        suite?: {
            id?: string | undefined;
        } | undefined;
        ci?: {
            buildkite?: {
                build_id?: string | undefined;
                job_id?: string | undefined;
                build_url?: string | undefined;
                pipeline_slug?: string | undefined;
                pull_request?: string | undefined;
                branch?: string | undefined;
                commit?: string | undefined;
            } | undefined;
        } | undefined;
    }[];
    total: number;
}, unknown>;
export declare const useEvalsTraceFetcher: () => TraceFetcher;
interface TracingProjectsFilters {
    from?: string;
    to?: string;
    name?: string;
    page?: number;
    perPage?: number;
}
interface TracingProjectsOptions {
    refetchInterval?: number | false;
}
export declare const useTracingProjects: (filters?: TracingProjectsFilters, options?: TracingProjectsOptions) => import("@kbn/react-query").UseQueryResult<{
    projects: {
        name: string;
        trace_count: number;
        last_trace_time: string;
        error_rate?: number | undefined;
        p50_latency_ms?: number | undefined;
        p99_latency_ms?: number | undefined;
        total_tokens?: number | undefined;
    }[];
    total: number;
}, unknown>;
interface ProjectTracesFilters {
    from?: string;
    to?: string;
    name?: string;
    sortField?: string;
    sortOrder?: string;
    page?: number;
    perPage?: number;
}
interface ProjectTracesOptions {
    refetchInterval?: number | false;
}
export declare const useProjectTraces: (projectName: string, filters?: ProjectTracesFilters, options?: ProjectTracesOptions) => import("@kbn/react-query").UseQueryResult<{
    traces: {
        trace_id: string;
        name: string;
        start_time: string;
        duration_ms: number;
        status?: string | undefined;
        total_spans?: number | undefined;
        input_preview?: string | undefined;
        output_preview?: string | undefined;
        error?: string | undefined;
        tokens?: {
            input?: number | undefined;
            output?: number | undefined;
            total?: number | undefined;
        } | undefined;
        prompt_id?: string | undefined;
        model?: string | undefined;
    }[];
    total: number;
}, unknown>;
export {};
