/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { SomeDevLog } from '@kbn/some-dev-log';
import { ModelFamily, ModelProvider, type Model } from '@kbn/inference-common';
import { buildRunFilterQuery, buildStatsAggregation, SCORES_SORT_ORDER } from '@kbn/evals-common';

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
const EVALUATIONS_SCHEMA_VERSION = 1;
export class EvaluationScoreRepository {
  constructor(private readonly esClient: EsClient, private readonly log: SomeDevLog) {}

  private isBuildkitePullRequest(): boolean {
    const pr = process.env.BUILDKITE_PULL_REQUEST;
    return Boolean(pr && pr !== 'false');
  }

  private shouldManageSchema(): boolean {
    // If we're exporting to a separate (shared) cluster, default to *not* mutating cluster schema.
    // CI jobs for PRs should not update templates or create/rollover data streams on the golden cluster.
    const isExternalEvaluationsCluster = Boolean(
      process.env.EVALUATIONS_ES_URL || process.env.EVALUATIONS_ES_API_KEY
    );

    // Opt-in for operators / weekly pipeline when schema changes are intended.
    if (process.env.KBN_EVALS_MANAGE_EVALUATIONS_SCHEMA === 'true') {
      if (this.isBuildkitePullRequest()) {
        throw new Error(
          'KBN_EVALS_MANAGE_EVALUATIONS_SCHEMA=true is not allowed on Buildkite PR builds. ' +
            'Schema management must be performed by the weekly pipeline or an operator using the schema manager key.'
        );
      }
      return true;
    }

    // Safe by default for local Scout test clusters (no external EVAL cluster configured).
    return !isExternalEvaluationsCluster;
  }

  private async assertIndexTemplateCompatible(): Promise<void> {
    let response: any;
    try {
      response = await this.esClient.indices.getIndexTemplate({
        name: EVALUATIONS_DATA_STREAM_TEMPLATE,
      });
    } catch (error: any) {
      if (error?.statusCode === 404) {
        throw new Error(
          `Elasticsearch index template ${EVALUATIONS_DATA_STREAM_TEMPLATE} does not exist. ` +
            `The golden cluster must be initialized by a schema manager before PR CI can export results.`
        );
      }
      throw error;
    }

    const indexTemplate = response?.index_templates?.[0]?.index_template;
    const mappings = indexTemplate?.template?.mappings;
    const properties = mappings?.properties;
    const meta = mappings?._meta;

    const exampleInputEnabled = properties?.example?.properties?.input?.enabled;
    const taskOutputEnabled = properties?.task?.properties?.output?.enabled;
    const evaluatorMetadataType = properties?.evaluator?.properties?.metadata?.type;
    const schemaVersion = meta?.kbn_evals?.schema_version;

    const schemaVersionOk =
      schemaVersion === EVALUATIONS_SCHEMA_VERSION ||
      (EVALUATIONS_SCHEMA_VERSION === 1 && schemaVersion == null);

    const ok =
      exampleInputEnabled === false &&
      taskOutputEnabled === false &&
      evaluatorMetadataType === 'flattened' &&
      schemaVersionOk;

    if (!ok) {
      throw new Error(
        `Elasticsearch index template ${EVALUATIONS_DATA_STREAM_TEMPLATE} is incompatible with @kbn/evals. ` +
          `Expected schema_version=${EVALUATIONS_SCHEMA_VERSION}, example.input.enabled=false, task.output.enabled=false, evaluator.metadata.type=flattened. ` +
          `Got example.input.enabled=${String(exampleInputEnabled)}, task.output.enabled=${String(
            taskOutputEnabled
          )}, evaluator.metadata.type=${String(evaluatorMetadataType)}. ` +
          `schema_version=${String(schemaVersion)}. ` +
          `This usually means the golden cluster template is stale and needs an update + data stream rollover.`
      );
    }
  }

  private async assertExportPrivileges(): Promise<void> {
    const hasPrivilegesResponse: any = await (this.esClient as any).security.hasPrivileges({
      body: {
        index: [
          {
            names: [EVALUATIONS_DATA_STREAM_WILDCARD],
            privileges: ['create_doc', 'read', 'view_index_metadata'],
          },
        ],
      },
    });

    const ok = Boolean(hasPrivilegesResponse?.has_all_requested);
    if (!ok) {
      throw new Error(
        `Elasticsearch export API key is missing required privileges on ${EVALUATIONS_DATA_STREAM_WILDCARD}. ` +
          `Required: create_doc, read, view_index_metadata.`
      );
    }
  }

  private async assertLatestBackingIndexCompatible(): Promise<void> {
    const ds: any = await this.esClient.indices.getDataStream({
      name: EVALUATIONS_DATA_STREAM_ALIAS,
    });
    const dataStream = ds?.data_streams?.[0];
    const latestIndex = dataStream?.indices?.slice(-1)?.[0]?.index_name;
    if (!latestIndex) {
      throw new Error(
        `Unable to determine backing index for data stream ${EVALUATIONS_DATA_STREAM_ALIAS}.`
      );
    }

    const mapping: any = await this.esClient.indices.getMapping({ index: latestIndex });
    const m = mapping?.[latestIndex]?.mappings?.properties;
    const exampleInputEnabled = m?.example?.properties?.input?.enabled;
    const taskOutputEnabled = m?.task?.properties?.output?.enabled;

    if (exampleInputEnabled !== false || taskOutputEnabled !== false) {
      throw new Error(
        `Latest backing index ${latestIndex} for ${EVALUATIONS_DATA_STREAM_ALIAS} is incompatible with @kbn/evals. ` +
          `This usually means the template was updated but the data stream was not rolled over yet.`
      );
    }
  }

  private async ensureIndexTemplate(): Promise<void> {
    const templateBody = {
      index_patterns: [EVALUATIONS_DATA_STREAM_WILDCARD],
      data_stream: {},
      template: {
        settings: {
          refresh_interval: '5s',
        },
        mappings: {
          _meta: {
            kbn_evals: {
              managed_by: 'kbn-evals',
              schema_version: EVALUATIONS_SCHEMA_VERSION,
            },
          },
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
      if (this.shouldManageSchema()) {
        await this.esClient.indices.putIndexTemplate({
          name: EVALUATIONS_DATA_STREAM_TEMPLATE,
          index_patterns: templateBody.index_patterns,
          data_stream: templateBody.data_stream,
          template: templateBody.template as any,
        });

        this.log.debug('Ensured Elasticsearch index template for evaluation scores');
        return;
      }

      await this.assertIndexTemplateCompatible();
    } catch (error) {
      this.log.error('Failed to ensure index template:', error);
      throw error;
    }
  }

  private async ensureDatastream(): Promise<void> {
    try {
      await this.esClient.indices.getDataStream({
        name: EVALUATIONS_DATA_STREAM_ALIAS,
      });
    } catch (error: any) {
      if (error?.statusCode === 404) {
        if (!this.shouldManageSchema()) {
          throw new Error(
            `Elasticsearch data stream ${EVALUATIONS_DATA_STREAM_ALIAS} does not exist, and schema management is disabled. ` +
              `This usually means the golden cluster is not initialized for @kbn/evals exports.`
          );
        }

        await this.esClient.indices.createDataStream({
          name: EVALUATIONS_DATA_STREAM_ALIAS,
        });
        this.log.debug(`Created datastream: ${EVALUATIONS_DATA_STREAM_ALIAS}`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Validates that exporting to the evaluations datastream is possible *before* the evaluation
   * suite spends time on inference.
   *
   * For external (golden) clusters, this check is deliberately non-invasive:
   * - Validates the index template schema version and required mapping invariants
   * - Validates the latest backing index is compatible (rollover has occurred)
   * - Validates the API key has the privileges needed to export results
   */
  async preflightExport(runId: string): Promise<void> {
    await this.ensureIndexTemplate();
    await this.ensureDatastream();

    if (!this.shouldManageSchema()) {
      await this.assertExportPrivileges();
      await this.assertLatestBackingIndexCompatible();
    }

    const suiteId = process.env.EVAL_SUITE_ID ?? 'unknown-suite';
    const buildId = process.env.BUILDKITE_BUILD_ID ?? 'local';
    const jobId = process.env.BUILDKITE_JOB_ID ?? 'local';

    // Deliberately not `runId` to avoid polluting real run queries if a preflight doc remains.
    const preflightRunId = 'kbn-evals-preflight';

    // Prefer a deterministic ID to reduce leftover-document growth if deletion is not permitted.
    // Create conflicts (409) are treated as success.
    const sentinelId = [
      'preflight',
      buildId,
      jobId,
      suiteId,
      String(EVALUATIONS_SCHEMA_VERSION),
    ].join('-');

    const sentinelDoc: EvaluationScoreDocument = {
      '@timestamp': new Date().toISOString(),
      run_id: preflightRunId,
      experiment_id: 'preflight',
      suite: { id: suiteId },
      ci: {
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
      },
      example: {
        id: 'preflight',
        index: 0,
        input: {
          // Keep small + stable; when mappings are correct, this is ignored by ES (enabled:false).
          kind: 'preflight',
          schema_version: EVALUATIONS_SCHEMA_VERSION,
        },
        dataset: {
          id: 'preflight',
          name: 'preflight',
        },
      },
      task: {
        trace_id: null,
        repetition_index: 0,
        output: {
          kind: 'preflight',
          schema_version: EVALUATIONS_SCHEMA_VERSION,
        },
        model: {
          id: 'kbn-evals-preflight',
          family: ModelFamily.GPT,
          provider: ModelProvider.OpenAI,
        },
      },
      evaluator: {
        name: 'preflight',
        score: 0,
        label: 'ok',
        explanation: null,
        metadata: { preflight: true, schema_version: EVALUATIONS_SCHEMA_VERSION },
        trace_id: null,
        model: {
          id: 'kbn-evals-preflight',
          family: ModelFamily.GPT,
          provider: ModelProvider.OpenAI,
        },
      },
      run_metadata: {
        git_branch: null,
        git_commit_sha: null,
        total_repetitions: 1,
      },
      environment: {
        hostname: 'preflight',
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
    } catch (error: any) {
      // If the document already exists, preflight still succeeded.
      if (error?.statusCode !== 409) {
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
        } catch (error: any) {
          if (error?.statusCode === 403 || error?.statusCode === 404) {
            // Ignore: writer keys may not have delete privilege; 404 is also fine.
          } else {
            this.log.warning(`Failed to delete export preflight document: ${sentinelId}`);
            this.log.debug(error);
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
      await this.ensureIndexTemplate();
      await this.ensureDatastream();

      if (documents.length === 0) {
        this.log.warning('No evaluation scores to export');
        return;
      }

      const buildkite = options.buildkite ?? getBuildkiteCiMetadataFromEnv();
      const suiteId = options.suiteId ?? process.env.EVAL_SUITE_ID;
      const enrichedDocuments =
        suiteId || buildkite
          ? documents.map((doc) => ({
              ...doc,
              suite: doc.suite ?? (suiteId ? { id: suiteId } : undefined),
              ci: doc.ci ?? (buildkite ? { buildkite } : undefined),
            }))
          : documents;

      // Bulk index documents
      if (enrichedDocuments.length > 0) {
        const dropped: Array<BulkDroppedDocument<EvaluationScoreDocument>> = [];

        const stats = await this.esClient.helpers.bulk({
          datasource: enrichedDocuments,
          onDocument: (doc) => {
            // Documents are exported from multiple suites *and* multiple task models/connectors.
            // Keep IDs unique across that matrix while maintaining deterministic IDs for re-runs.
            const suiteIdPart = doc.suite?.id ?? 'unknown-suite';
            const taskModelIdPart = doc.task.model.id;
            const docId = [
              doc.run_id,
              suiteIdPart,
              taskModelIdPart,
              doc.example.dataset.id,
              doc.example.id,
              doc.evaluator.name,
              doc.task.repetition_index,
            ].join('-');

            return {
              // Data streams only allow create operations. Use deterministic document IDs so:
              // - Re-runs/retries don't create duplicates (they'll 409 conflict instead)
              // - We can treat 409s as a no-op for idempotency
              create: {
                _index: EVALUATIONS_DATA_STREAM_ALIAS,
                _id: docId,
              },
            };
          },
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
