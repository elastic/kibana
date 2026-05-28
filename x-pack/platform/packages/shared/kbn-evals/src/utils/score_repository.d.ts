import type { Client as EsClient } from '@elastic/elasticsearch';
import type { SomeDevLog } from '@kbn/some-dev-log';
import type { Model } from '@kbn/inference-common';
export interface EvaluationScoreDocument {
    '@timestamp': string;
    run_id: string;
    experiment_id: string;
    /**
     * Optional CI metadata to correlate scores back to a suite and Buildkite build/job.
     * These fields are safe to omit in non-CI environments.
     */
    suite?: {
        id?: string;
    };
    ci?: {
        buildkite?: {
            build_id?: string;
            job_id?: string;
            build_url?: string;
            pipeline_slug?: string;
            pull_request?: string;
            branch?: string;
            commit?: string;
        };
    };
    example: {
        id: string;
        index: number;
        input?: Record<string, unknown> | null;
        dataset: {
            id: string;
            name: string;
        };
    };
    task: {
        trace_id: string | null;
        repetition_index: number;
        output?: unknown | null;
        model: Model;
    };
    evaluator: {
        name: string;
        score: number | null;
        label: string | null;
        explanation: string | null;
        metadata: Record<string, unknown> | null;
        trace_id: string | null;
        model: Model;
    };
    run_metadata: {
        git_branch: string | null;
        git_commit_sha: string | null;
        total_repetitions: number;
    };
    environment: {
        hostname: string;
    };
}
type BuildkiteCiMetadata = NonNullable<NonNullable<EvaluationScoreDocument['ci']>['buildkite']>;
/**
 * Optional metadata enrichment for exported evaluation score documents.
 */
export interface ExportScoresOptions {
    /**
     * Optional suite identifier to attach to exported documents.
     *
     * Defaults to `process.env.EVAL_SUITE_ID`.
     */
    suiteId?: string;
    /**
     * Optional Buildkite CI metadata to attach to exported documents.
     *
     * Defaults to environment-derived Buildkite metadata (if any).
     */
    buildkite?: BuildkiteCiMetadata;
}
/**
 * Statistics for a single evaluator on a single dataset.
 * This is the core data structure returned by ES aggregations and used throughout the reporting system.
 */
export interface EvaluatorStats {
    datasetId: string;
    datasetName: string;
    evaluatorName: string;
    stats: {
        mean: number;
        median: number;
        stdDev: number;
        min: number;
        max: number;
        count: number;
    };
}
export interface RunStats {
    stats: EvaluatorStats[];
    taskModel: Model;
    evaluatorModel: Model;
    totalRepetitions: number;
}
/**
 * Builds a deterministic document ID from the score document's key fields.
 * Used by both batch (`exportScores`) and incremental (`indexSingleScore`) paths
 * to ensure idempotent writes — re-indexing the same result produces a 409 conflict
 * rather than a duplicate.
 */
export declare function computeScoreDocumentId(doc: EvaluationScoreDocument): string;
export declare class EvaluationScoreRepository {
    private readonly esClient;
    private readonly log;
    private localExportTargetReady;
    constructor(esClient: EsClient, log: SomeDevLog);
    private getErrorStatusCode;
    private shouldSetupExportTarget;
    private ensureIndexTemplate;
    private ensureDatastream;
    private prepareLocalExportTarget;
    /**
     * Validates that exporting to the evaluations datastream is possible *before* the evaluation
     * suite spends time on inference.
     *
     * This is intentionally behavioral (a real write) rather than mapping-based. Mapping checks tend
     * to become brittle as the schema evolves; a representative write will fail for the reasons we
     * actually care about (missing data stream/template, auth/privilege issues, mapper errors, etc).
     */
    preflightExport(): Promise<void>;
    exportScores(documents: EvaluationScoreDocument[], options?: ExportScoresOptions): Promise<void>;
    /**
     * Indexes a single evaluation score document to Elasticsearch immediately.
     * Used for incremental writes so results survive worker crashes.
     *
     * Uses `refresh: 'wait_for'` so scores are searchable immediately (e.g. for
     * per-worker terminal summaries and other readers right after incremental write).
     * Deterministic IDs (via {@link computeScoreDocumentId}) make this idempotent —
     * the batch export at teardown will simply encounter 409 conflicts for
     * already-written documents.
     */
    indexSingleScore(document: EvaluationScoreDocument, options?: ExportScoresOptions): Promise<void>;
    getStatsByRunId(runId: string, options?: {
        taskModelId?: string;
        suiteId?: string;
    }): Promise<RunStats | null>;
    getScoresByRunId(runId: string, options?: {
        taskModelId?: string;
        suiteId?: string;
    }): Promise<EvaluationScoreDocument[]>;
}
export {};
