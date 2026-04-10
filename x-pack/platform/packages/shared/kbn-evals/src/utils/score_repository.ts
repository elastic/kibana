/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { SomeDevLog } from '@kbn/some-dev-log';
import type { Model } from '@kbn/inference-common';
import { buildRunFilterQuery, buildStatsAggregation, SCORES_SORT_ORDER } from '@kbn/evals-common';
import { getEvalDoc } from '../evaluations_export/eval_doc';

interface BulkDroppedDocument<TDocument> {
  status?: number;
  error?: {
    type?: string;
    reason?: string;
    caused_by?: unknown;
    root_cause?: unknown;
  };
  operation?: unknown;
  document?: TDocument;
}

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

function getBuildkiteCiMetadataFromEnv(): BuildkiteCiMetadata | undefined {
  const pullRequest =
    process.env.BUILDKITE_PULL_REQUEST && process.env.BUILDKITE_PULL_REQUEST !== 'false'
      ? process.env.BUILDKITE_PULL_REQUEST
      : undefined;

  const hasAnyBuildkiteMetadata =
    process.env.BUILDKITE_BUILD_ID ||
    process.env.BUILDKITE_JOB_ID ||
    process.env.BUILDKITE_BUILD_URL ||
    process.env.BUILDKITE_PIPELINE_SLUG ||
    pullRequest ||
    process.env.BUILDKITE_BRANCH ||
    process.env.BUILDKITE_COMMIT;

  if (!hasAnyBuildkiteMetadata) {
    return undefined;
  }

  return {
    build_id: process.env.BUILDKITE_BUILD_ID,
    job_id: process.env.BUILDKITE_JOB_ID,
    build_url: process.env.BUILDKITE_BUILD_URL,
    pipeline_slug: process.env.BUILDKITE_PIPELINE_SLUG,
    pull_request: pullRequest,
    branch: process.env.BUILDKITE_BRANCH,
    commit: process.env.BUILDKITE_COMMIT,
  };
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

interface RunStatsAggregations {
  by_dataset?: {
    buckets?: Array<{
      key: string;
      dataset_name?: { buckets?: Array<{ key: string }> };
      by_evaluator?: {
        buckets?: Array<{
          key: string;
          score_stats?: {
            avg?: number;
            std_deviation?: number;
            min?: number;
            max?: number;
            count?: number;
          };
          // Captured by percentiles aggregation opposed to the extended_stats aggregation used for the above
          score_median?: { values?: Record<string, number> };
        }>;
      };
    }>;
  };
}

const EVALUATIONS_DATA_STREAM_ALIAS = 'kibana-evaluations';
const EVALUATIONS_DATA_STREAM_WILDCARD = 'kibana-evaluations*';
const EVALUATIONS_DATA_STREAM_TEMPLATE = 'kibana-evaluations-template';

/**
 * Builds a deterministic document ID from the score document's key fields.
 * Used by both batch (`exportScores`) and incremental (`indexSingleScore`) paths
 * to ensure idempotent writes — re-indexing the same result produces a 409 conflict
 * rather than a duplicate.
 */
export function computeScoreDocumentId(doc: EvaluationScoreDocument): string {
  const suiteIdPart = doc.suite?.id ?? 'unknown-suite';
  return [
    doc.run_id,
    suiteIdPart,
    doc.task.model.id,
    doc.example.dataset.id,
    doc.example.id,
    doc.evaluator.name,
    doc.task.repetition_index,
  ].join('-');
}

function enrichDocument(
  doc: EvaluationScoreDocument,
  suiteId: string | undefined,
  buildkite: BuildkiteCiMetadata | undefined
): EvaluationScoreDocument {
  if (!suiteId && !buildkite) {
    return doc;
  }
  return {
    ...doc,
    suite: doc.suite ?? (suiteId ? { id: suiteId } : undefined),
    ci: doc.ci ?? (buildkite ? { buildkite } : undefined),
  };
}

export class EvaluationScoreRepository {
  private localExportTargetReady: Promise<void> | undefined;

  constructor(private readonly esClient: EsClient, private readonly log: SomeDevLog) {}

  private getErrorStatusCode(error: unknown): number | undefined {
    if (typeof error !== 'object' || error === null) {
      return undefined;
    }

    const asRecord = error as Record<string, unknown>;
    const direct = asRecord.statusCode;
    if (typeof direct === 'number') {
      return direct;
    }

    const meta = asRecord.meta;
    if (typeof meta !== 'object' || meta === null) {
      return undefined;
    }

    const metaRecord = meta as Record<string, unknown>;
    const metaStatusCode = metaRecord.statusCode;
    if (typeof metaStatusCode === 'number') {
      return metaStatusCode;
    }

    return undefined;
  }

  private shouldSetupExportTarget(): boolean {
    const esUrl = process.env.EVALUATIONS_ES_URL;
    if (!esUrl) {
      return true;
    }

    try {
      const hostname = new URL(esUrl).hostname.replace(/\.$/, '').toLowerCase();
      return hostname === 'localhost' || hostname === '127.0.0.1';
    } catch {
      return false;
    }
  }

  private async ensureIndexTemplate(): Promise<void> {
    if (!this.shouldSetupExportTarget()) {
      return;
    }

    const templateBody = {
      index_patterns: [EVALUATIONS_DATA_STREAM_WILDCARD],
      data_stream: {},
      template: {
        settings: {
          refresh_interval: '5s',
        },
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            run_id: { type: 'keyword' },
            experiment_id: { type: 'keyword' },
            suite: {
              type: 'object',
              properties: {
                id: { type: 'keyword' },
              },
            },
            ci: {
              type: 'object',
              properties: {
                buildkite: {
                  type: 'object',
                  properties: {
                    build_id: { type: 'keyword' },
                    job_id: { type: 'keyword' },
                    build_url: { type: 'keyword' },
                    pipeline_slug: { type: 'keyword' },
                    pull_request: { type: 'keyword' },
                    branch: { type: 'keyword' },
                    commit: { type: 'keyword' },
                  },
                },
              },
            },
            example: {
              type: 'object',
              properties: {
                id: { type: 'keyword' },
                index: { type: 'integer' },
                input: { type: 'object', enabled: false },
                dataset: {
                  type: 'object',
                  properties: {
                    id: { type: 'keyword' },
                    name: { type: 'keyword' },
                  },
                },
              },
            },
            task: {
              type: 'object',
              properties: {
                trace_id: { type: 'keyword' },
                repetition_index: { type: 'integer' },
                output: { type: 'object', enabled: false },
                model: {
                  type: 'object',
                  properties: {
                    id: { type: 'keyword' },
                    family: { type: 'keyword' },
                    provider: { type: 'keyword' },
                  },
                },
              },
            },
            evaluator: {
              type: 'object',
              properties: {
                name: { type: 'keyword' },
                score: { type: 'float' },
                label: { type: 'keyword' },
                explanation: { type: 'text', index: false },
                metadata: { type: 'flattened' },
                trace_id: { type: 'keyword' },
                model: {
                  type: 'object',
                  properties: {
                    id: { type: 'keyword' },
                    family: { type: 'keyword' },
                    provider: { type: 'keyword' },
                  },
                },
              },
            },
            run_metadata: {
              type: 'object',
              properties: {
                git_branch: { type: 'keyword' },
                git_commit_sha: { type: 'keyword' },
                total_repetitions: { type: 'integer' },
              },
            },
            environment: {
              type: 'object',
              properties: {
                hostname: { type: 'keyword' },
              },
            },
          },
        },
      },
    };

    try {
      const templateExists = await this.esClient.indices
        .existsIndexTemplate({
          name: EVALUATIONS_DATA_STREAM_TEMPLATE,
        })
        .catch(() => false);

      if (!templateExists) {
        const request: Parameters<EsClient['indices']['putIndexTemplate']>[0] = {
          name: EVALUATIONS_DATA_STREAM_TEMPLATE,
          index_patterns: templateBody.index_patterns,
          data_stream: templateBody.data_stream,
          template: templateBody.template as unknown as Parameters<
            EsClient['indices']['putIndexTemplate']
          >[0]['template'],
        };
        await this.esClient.indices.putIndexTemplate(request);

        this.log.debug('Created Elasticsearch index template for evaluation scores');
      }
    } catch (error) {
      this.log.error('Failed to create index template:', error);
      throw error;
    }
  }

  private async ensureDatastream(): Promise<void> {
    if (!this.shouldSetupExportTarget()) {
      return;
    }

    try {
      await this.esClient.indices.getDataStream({
        name: EVALUATIONS_DATA_STREAM_ALIAS,
      });
    } catch (error: unknown) {
      if (this.getErrorStatusCode(error) === 404) {
        await this.esClient.indices.createDataStream({
          name: EVALUATIONS_DATA_STREAM_ALIAS,
        });
        this.log.debug(`Created datastream: ${EVALUATIONS_DATA_STREAM_ALIAS}`);
        return;
      } else {
        throw error;
      }
    }
  }

  private prepareLocalExportTarget(): Promise<void> {
    if (!this.localExportTargetReady) {
      this.localExportTargetReady = (async () => {
        await this.ensureIndexTemplate();
        await this.ensureDatastream();
      })().catch((err) => {
        this.localExportTargetReady = undefined;
        throw err;
      });
    }
    return this.localExportTargetReady;
  }

  /**
   * Validates that exporting to the evaluations datastream is possible *before* the evaluation
   * suite spends time on inference.
   *
   * This is intentionally behavioral (a real write) rather than mapping-based. Mapping checks tend
   * to become brittle as the schema evolves; a representative write will fail for the reasons we
   * actually care about (missing data stream/template, auth/privilege issues, mapper errors, etc).
   */
  async preflightExport(): Promise<void> {
    // For local (Scout) clusters, keep bootstrapping behavior unchanged.
    await this.prepareLocalExportTarget();

    const suiteId = process.env.EVAL_SUITE_ID ?? 'unknown-suite';
    const buildId = process.env.BUILDKITE_BUILD_ID ?? 'local';
    const jobId = process.env.BUILDKITE_JOB_ID ?? 'local';

    // Deliberately not `runId` to avoid polluting real run queries if a preflight doc remains.
    const preflightRunId = 'kbn-evals-preflight';

    // Prefer a deterministic ID to reduce leftover-document growth if deletion is not permitted.
    // Create conflicts (409) are treated as success.
    const sentinelId = ['preflight', buildId, jobId, suiteId].join('-');

    const sentinelDoc = getEvalDoc();
    sentinelDoc['@timestamp'] = new Date().toISOString();
    sentinelDoc.run_id = preflightRunId;
    sentinelDoc.experiment_id = 'preflight';
    sentinelDoc.suite = { id: suiteId };
    sentinelDoc.ci = {
      buildkite: {
        build_id: process.env.BUILDKITE_BUILD_ID,
        job_id: process.env.BUILDKITE_JOB_ID,
        build_url: process.env.BUILDKITE_BUILD_URL,
        pipeline_slug: process.env.BUILDKITE_PIPELINE_SLUG,
        pull_request:
          process.env.BUILDKITE_PULL_REQUEST && process.env.BUILDKITE_PULL_REQUEST !== 'false'
            ? process.env.BUILDKITE_PULL_REQUEST
            : undefined,
        branch: process.env.BUILDKITE_BRANCH,
        commit: process.env.BUILDKITE_COMMIT,
      },
    };

    let created = false;
    try {
      await this.esClient.create({
        index: EVALUATIONS_DATA_STREAM_ALIAS,
        id: sentinelId,
        document: sentinelDoc,
        refresh: 'wait_for',
      });
      created = true;
    } catch (error: unknown) {
      // If the document already exists, preflight still succeeded.
      if (this.getErrorStatusCode(error) !== 409) {
        throw error;
      }
    } finally {
      // Best-effort cleanup. Many writer keys intentionally cannot delete; ignore those failures.
      if (created) {
        try {
          await this.esClient.delete({
            index: EVALUATIONS_DATA_STREAM_ALIAS,
            id: sentinelId,
            refresh: 'wait_for',
          });
        } catch (error: unknown) {
          const statusCode = this.getErrorStatusCode(error);
          if (statusCode === 403 || statusCode === 404) {
            // Ignore: writer keys may not have delete privilege; 404 is also fine.
          } else {
            this.log.warning(`Failed to delete export preflight document: ${sentinelId}`);
            this.log.debug(String(error));
          }
        }
      }
    }
  }

  async exportScores(
    documents: EvaluationScoreDocument[],
    options: ExportScoresOptions = {}
  ): Promise<void> {
    try {
      await this.prepareLocalExportTarget();

      if (documents.length === 0) {
        this.log.warning('No evaluation scores to export');
        return;
      }

      const buildkite = options.buildkite ?? getBuildkiteCiMetadataFromEnv();
      const suiteId = options.suiteId ?? process.env.EVAL_SUITE_ID;
      const enrichedDocuments = documents.map((doc) => enrichDocument(doc, suiteId, buildkite));

      if (enrichedDocuments.length > 0) {
        const dropped: Array<BulkDroppedDocument<EvaluationScoreDocument>> = [];

        const stats = await this.esClient.helpers.bulk({
          datasource: enrichedDocuments,
          onDocument: (doc) => ({
            create: {
              _index: EVALUATIONS_DATA_STREAM_ALIAS,
              _id: computeScoreDocumentId(doc),
            },
          }),
          onDrop: (droppedDoc) => {
            dropped.push(droppedDoc as BulkDroppedDocument<EvaluationScoreDocument>);
          },
          refresh: 'wait_for',
        });

        // Check for bulk operation errors
        if (stats.failed > 0) {
          // `helpers.bulk` counts any dropped operation as failed, including expected 409 conflicts
          // when re-exporting the same deterministic IDs. Ignore 409s to keep exports idempotent.
          //
          // Note: In the unlikely event that `helpers.bulk` reports `failed > 0` but does not call
          // `onDrop`, fall back to failing with an "unknown" reason.
          if (dropped.length === 0) {
            const firstErrorSummary = 'unknown failure reason';
            this.log.error(
              `Bulk indexing had ${stats.failed} failed operations out of ${stats.total}. ` +
                `First error: ${firstErrorSummary}`
            );

            throw new Error(
              `Bulk indexing failed: ${stats.failed} of ${stats.total} operations failed. ` +
                `First error: ${firstErrorSummary}`
            );
          }

          const conflicts = dropped.filter((d) => d.status === 409);
          const nonConflictDropped = dropped.filter((d) => d.status !== 409);

          if (nonConflictDropped.length === 0) {
            this.log.debug(
              `Bulk indexing had ${conflicts.length} 409 conflicts out of ${stats.total} operations (ignored)`
            );
            this.log.debug(
              `Successfully indexed ${stats.successful} evaluation scores (${conflicts.length} already existed)`
            );
            return;
          }

          const first = nonConflictDropped[0];
          const firstErrorSummary = first.error
            ? `${first.status ?? 'unknown status'} ${first.error.type ?? 'unknown type'}: ${
                first.error.reason ?? 'unknown reason'
              }`
            : 'unknown failure reason';

          this.log.error(
            `Bulk indexing had ${nonConflictDropped.length} failed operations out of ${stats.total} ` +
              `(${conflicts.length} conflicts ignored). First error: ${firstErrorSummary}`
          );

          throw new Error(
            `Bulk indexing failed: ${nonConflictDropped.length} of ${stats.total} operations failed ` +
              `(${conflicts.length} conflicts ignored). First error: ${firstErrorSummary}`
          );
        }

        this.log.debug(`Successfully indexed ${stats.successful} evaluation scores`);
      }
    } catch (error) {
      const cause = error instanceof Error ? error : new Error(String(error));
      this.log.error('Failed to export scores to Elasticsearch', cause);
      throw cause;
    }
  }

  /**
   * Indexes a single evaluation score document to Elasticsearch immediately.
   * Used for incremental writes so results survive worker crashes.
   *
   * Uses `refresh: false` to avoid the shard refresh penalty on every write;
   * documents become queryable within the default 5s refresh interval.
   * Deterministic IDs (via {@link computeScoreDocumentId}) make this idempotent —
   * the batch export at teardown will simply encounter 409 conflicts for
   * already-written documents.
   */
  async indexSingleScore(
    document: EvaluationScoreDocument,
    options: ExportScoresOptions = {}
  ): Promise<void> {
    await this.prepareLocalExportTarget();

    const buildkite = options.buildkite ?? getBuildkiteCiMetadataFromEnv();
    const suiteId = options.suiteId ?? process.env.EVAL_SUITE_ID;
    const enrichedDoc = enrichDocument(document, suiteId, buildkite);
    const docId = computeScoreDocumentId(enrichedDoc);

    try {
      await this.esClient.create({
        index: EVALUATIONS_DATA_STREAM_ALIAS,
        id: docId,
        document: enrichedDoc,
        refresh: false,
      });
    } catch (error: unknown) {
      if (this.getErrorStatusCode(error) === 409) {
        return;
      }
      throw error;
    }
  }

  async getStatsByRunId(
    runId: string,
    options?: { taskModelId?: string; suiteId?: string }
  ): Promise<RunStats | null> {
    try {
      const runQuery = buildRunFilterQuery(runId, {
        modelId: options?.taskModelId,
        suiteId: options?.suiteId,
      });

      const metadataResponse = await this.esClient.search<EvaluationScoreDocument>({
        index: EVALUATIONS_DATA_STREAM_ALIAS,
        query: runQuery,
        size: 1,
      });

      // Used for metadata for the evaluation run (all score documents capture the same metadata)
      const firstDoc = metadataResponse.hits?.hits[0]?._source;
      if (!firstDoc) {
        return null;
      }

      const aggResponse = await this.esClient.search({
        index: EVALUATIONS_DATA_STREAM_ALIAS,
        size: 0,
        query: runQuery,
        aggs: buildStatsAggregation(),
      });

      const aggregations = aggResponse.aggregations as RunStatsAggregations | undefined;
      const datasetBuckets = aggregations?.by_dataset?.buckets ?? [];

      const stats = datasetBuckets.flatMap((datasetBucket) => {
        const datasetId = datasetBucket.key;
        const datasetName = datasetBucket.dataset_name?.buckets?.[0]?.key ?? datasetId;
        const evaluatorBuckets = datasetBucket.by_evaluator?.buckets ?? [];

        return evaluatorBuckets.map((evaluatorBucket) => {
          const scoreStats = evaluatorBucket.score_stats;
          const median = evaluatorBucket.score_median?.values?.['50.0'];

          return {
            datasetId,
            datasetName,
            evaluatorName: evaluatorBucket.key,
            stats: {
              mean: scoreStats?.avg ?? 0,
              median: median ?? 0,
              stdDev: scoreStats?.std_deviation ?? 0,
              min: scoreStats?.min ?? 0,
              max: scoreStats?.max ?? 0,
              count: scoreStats?.count ?? 0,
            },
          };
        });
      });

      return {
        stats,
        taskModel: firstDoc.task.model,
        evaluatorModel: firstDoc.evaluator.model,
        totalRepetitions: firstDoc.run_metadata?.total_repetitions ?? 1,
      };
    } catch (error) {
      this.log.error(`Failed to retrieve stats for run ID ${runId}:`, error);
      return null;
    }
  }

  async getScoresByRunId(
    runId: string,
    options?: { taskModelId?: string; suiteId?: string }
  ): Promise<EvaluationScoreDocument[]> {
    try {
      const query = buildRunFilterQuery(runId, {
        modelId: options?.taskModelId,
        suiteId: options?.suiteId,
      });

      const response = await this.esClient.search<EvaluationScoreDocument>({
        index: EVALUATIONS_DATA_STREAM_ALIAS,
        query,
        sort: SCORES_SORT_ORDER,
        size: 10000,
      });

      const hits = response.hits?.hits || [];
      const scores = hits
        .map((hit) => hit._source)
        .filter((source): source is EvaluationScoreDocument => source !== undefined);

      this.log.info(`Retrieved ${scores.length} scores for run ID: ${runId}`);
      return scores;
    } catch (error) {
      this.log.error(`Failed to retrieve scores for run ID ${runId}:`, error);
      return [];
    }
  }
}
