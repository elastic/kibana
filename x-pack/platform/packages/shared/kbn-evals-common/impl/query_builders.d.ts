interface ExperimentFilterOptions {
    suiteId?: string;
    modelId?: string;
    filterField?: 'experiment_id' | 'metadata.execution_id';
    spaceId?: string;
}
interface ExperimentsListingFilterOptions {
    suiteId?: string;
    modelId?: string;
    branch?: string;
    search?: string;
    datasetId?: string;
    datasetName?: string;
    buildId?: string;
    spaceId?: string;
}
interface ExperimentsListingPaginationOptions {
    page: number;
    perPage: number;
}
export interface ExperimentsListingResult {
    experiments: Array<{
        execution_id: string;
        experiment_id: string;
        experiment_name: string | null;
        experiment_count: number;
        timestamp: string | undefined;
        suite_id: string | undefined;
        dataset_ids: string[];
        dataset_names: string[];
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
 * Builds a filter that matches score documents visible in the given space: those
 * assigned to the space (or to all spaces via `*`)
 */
export declare const buildSpaceFilter: (spaceId: string) => Record<string, unknown>;
/**
 * Builds a bool/must query that filters evaluation score documents by experiment ID
 * with optional suite and task model filters.
 */
export declare const buildExperimentFilterQuery: (experimentId: string, options?: ExperimentFilterOptions) => {
    bool: {
        must: Array<Record<string, unknown>>;
    };
};
/**
 * Builds a bool/must query that filters evaluation score documents by example ID.
 */
export declare const buildExampleScoresQuery: (exampleId: string, options?: {
    spaceId?: string;
}) => {
    bool: {
        must: Array<Record<string, unknown>>;
    };
};
/**
 * Builds a bool/must query that filters evaluation score documents by
 * dataset ID and experiment ID (or metadata.execution_id when filterField is specified).
 */
export declare const buildDatasetExampleScoresQuery: (datasetId: string, experimentId: string, options?: {
    filterField?: "experiment_id" | "metadata.execution_id";
    spaceId?: string;
}) => {
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
            example_count: {
                cardinality: {
                    field: string;
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
 * Escapes Elasticsearch wildcard metacharacters (`\`, `*`, `?`) in user input so the literal
 * characters are matched rather than interpreted as wildcards.
 */
export declare const escapeWildcard: (input: string) => string;
/**
 * Builds the filter query for the experiments listing endpoint.
 * Supports optional suite, model, and branch filters.
 * Always excludes preflight check experiments.
 */
export declare const buildExperimentsListingFilterQuery: (options?: ExperimentsListingFilterOptions) => Record<string, unknown>;
/**
 * Returns the aggregation definition for listing experiments with summary metadata.
 * Groups score documents by experiment_id and extracts the latest timestamp,
 * model info, git metadata, and CI info for each experiment.
 *
 * Terms aggregations don't support a native offset, so we over-fetch
 * (page * perPage buckets) and let `parseExperimentsListingResponse` slice the
 * correct window.
 */
export declare const buildExperimentsListingAggregation: ({ page, perPage, }: ExperimentsListingPaginationOptions) => {
    total_experiments: {
        cardinality: {
            field: string;
        };
    };
    experiments: {
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
            experiment_count: {
                cardinality: {
                    field: string;
                };
            };
            experiment_name: {
                terms: {
                    field: string;
                    size: number;
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
 * Parses the raw ES aggregation response from an experiments listing query
 * into a typed array of experiment summaries with a total count.
 *
 * Because terms aggregations don't support offset, the aggregation
 * over-fetches and this function slices to the requested page window.
 */
export declare const parseExperimentsListingResponse: (aggregations: Record<string, unknown> | undefined, { page, perPage }: ExperimentsListingPaginationOptions) => ExperimentsListingResult;
export interface ExperimentDetailEvaluatorStat {
    dataset_id: string;
    dataset_name: string;
    evaluator_name: string;
    example_count: number;
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
 * Parses the stats aggregation response from an experiment detail query
 * into a typed array of per-evaluator, per-dataset statistics.
 */
export declare const parseStatsAggregationResponse: (aggregations: Record<string, unknown> | undefined) => ExperimentDetailEvaluatorStat[];
/**
 * Derives a human-readable model identifier from its component parts.
 * Falls back through id -> provider/family -> family -> provider -> 'unknown'.
 */
export declare const buildModelDisplayId: (id?: string, family?: string, provider?: string) => string;
export {};
