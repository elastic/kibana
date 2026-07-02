interface RunFilterOptions {
    suiteId?: string;
    modelId?: string;
}
interface RunsListingFilterOptions {
    suiteId?: string;
    modelId?: string;
    branch?: string;
    datasetId?: string;
    datasetName?: string;
}
interface RunsListingPaginationOptions {
    page: number;
    perPage: number;
}
export interface RunsListingResult {
    runs: Array<{
        run_id: string;
        timestamp: string | undefined;
        suite_id: string | undefined;
        dataset_id: string | null;
        dataset_name: string | null;
        task_model: {
            id: string;
            family: string | undefined;
            provider: string | undefined;
        };
        evaluator_model: {
            id: string;
            family: string | undefined;
            provider: string | undefined;
        };
        git_branch: string | null;
        git_commit_sha: string | null;
        total_repetitions: number;
        ci: {
            build_url: string | undefined;
            pull_request: string | undefined;
        };
    }>;
    total: number;
}
/**
 * Builds a bool/must query that filters evaluation score documents by run ID
 * with optional suite and task model filters.
 */
export declare const buildRunFilterQuery: (runId: string, options?: RunFilterOptions) => {
    bool: {
        must: Array<Record<string, unknown>>;
    };
};
/**
 * Builds a bool/must query that filters evaluation score documents by example ID.
 */
export declare const buildExampleScoresQuery: (exampleId: string) => {
    bool: {
        must: Array<Record<string, unknown>>;
    };
};
/**
 * Builds a bool/must query that filters evaluation score documents by
 * dataset ID and run ID.
 */
export declare const buildDatasetExampleScoresQuery: (datasetId: string, runId: string) => {
    bool: {
        must: Array<Record<string, unknown>>;
    };
};
/**
 * Returns the aggregation tree for computing per-evaluator, per-dataset statistics
 * (mean, median, std_dev, min, max, count).
 */
export declare const buildStatsAggregation: () => {
    by_dataset: {
        terms: {
            field: string;
            size: number;
        };
        aggs: {
            dataset_name: {
                terms: {
                    field: string;
                    size: number;
                };
            };
            by_evaluator: {
                terms: {
                    field: string;
                    size: number;
                };
                aggs: {
                    score_stats: {
                        extended_stats: {
                            field: string;
                        };
                    };
                    score_median: {
                        percentiles: {
                            field: string;
                            percents: number[];
                        };
                    };
                };
            };
        };
    };
};
/**
 * Standard sort order for retrieving individual score documents,
 * grouped by dataset, example, evaluator, then repetition.
 */
type SortField = Record<string, {
    order: 'asc' | 'desc';
}>;
export declare const SCORES_SORT_ORDER: SortField[];
/**
 * Builds the filter query for the runs listing endpoint.
 * Supports optional suite, model, and branch filters.
 * Always excludes preflight check runs.
 */
export declare const buildRunsListingFilterQuery: (options?: RunsListingFilterOptions) => Record<string, unknown>;
/**
 * Returns the aggregation definition for listing runs with summary metadata.
 * Groups score documents by run_id and extracts the latest timestamp,
 * model info, git metadata, and CI info for each run.
 *
 * Terms aggregations don't support a native offset, so we over-fetch
 * (page * perPage buckets) and let `parseRunsListingResponse` slice the
 * correct window.
 */
export declare const buildRunsListingAggregation: ({ page, perPage }: RunsListingPaginationOptions) => {
    total_runs: {
        cardinality: {
            field: string;
        };
    };
    runs: {
        terms: {
            field: string;
            size: number;
            order: {
                latest_timestamp: "desc";
            };
        };
        aggs: {
            latest_timestamp: {
                max: {
                    field: string;
                };
            };
            suite_id: {
                terms: {
                    field: string;
                    size: number;
                };
            };
            dataset_id: {
                terms: {
                    field: string;
                    size: number;
                };
            };
            dataset_name: {
                terms: {
                    field: string;
                    size: number;
                };
            };
            task_model_id: {
                terms: {
                    field: string;
                    size: number;
                };
            };
            task_model_family: {
                terms: {
                    field: string;
                    size: number;
                };
            };
            task_model_provider: {
                terms: {
                    field: string;
                    size: number;
                };
            };
            evaluator_model_id: {
                terms: {
                    field: string;
                    size: number;
                };
            };
            evaluator_model_family: {
                terms: {
                    field: string;
                    size: number;
                };
            };
            evaluator_model_provider: {
                terms: {
                    field: string;
                    size: number;
                };
            };
            git_branch: {
                terms: {
                    field: string;
                    size: number;
                };
            };
            git_commit_sha: {
                terms: {
                    field: string;
                    size: number;
                };
            };
            total_repetitions: {
                max: {
                    field: string;
                };
            };
            build_url: {
                terms: {
                    field: string;
                    size: number;
                };
            };
            pull_request: {
                terms: {
                    field: string;
                    size: number;
                };
            };
        };
    };
};
/**
 * Parses the raw ES aggregation response from a runs listing query
 * into a typed array of run summaries with a total count.
 *
 * Because terms aggregations don't support offset, the aggregation
 * over-fetches and this function slices to the requested page window.
 */
export declare const parseRunsListingResponse: (aggregations: Record<string, unknown> | undefined, { page, perPage }: RunsListingPaginationOptions) => RunsListingResult;
export interface RunDetailEvaluatorStat {
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
}
/**
 * Parses the stats aggregation response from a run detail query
 * into a typed array of per-evaluator, per-dataset statistics.
 */
export declare const parseStatsAggregationResponse: (aggregations: Record<string, unknown> | undefined) => RunDetailEvaluatorStat[];
/**
 * Derives a human-readable model identifier from its component parts.
 * Falls back through id -> provider/family -> family -> provider -> 'unknown'.
 */
export declare const buildModelDisplayId: (id?: string, family?: string, provider?: string) => string;
export {};
