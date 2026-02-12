/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import chalk from 'chalk';
import { hostname } from 'os';
import type { Model } from '@kbn/inference-common';
import type {
  EvaluationScoreRepository,
  EvaluatorStats as RepositoryEvaluatorStats,
} from './score_repository';
import { type EvaluationScoreDocument } from './score_repository';
import { getGitMetadata } from './git_metadata';
import {
  buildEvaluationResults,
  calculateEvaluatorStats,
  type DatasetScoreWithStats,
} from './evaluation_stats';
import type { EvaluationReport, RanExperiment, TraceLinkInfo, EvaluationRun, TaskRun } from '../types';
import { validateTraceId } from './improvement_suggestions/trace_preprocessor';

/**
 * Gets LangSmith configuration from environment variables.
 *
 * Environment variables:
 * - LANGSMITH_BASE_URL: Base URL for LangSmith (defaults to 'https://smith.langchain.com')
 * - LANGSMITH_ORG_ID: LangSmith organization ID
 * - LANGSMITH_PROJECT_ID: LangSmith project ID
 *
 * @returns LangSmith config or undefined if not configured
 */
export function getLangSmithConfig(): TraceLinkInfo['langsmith'] {
  const orgId = process.env.LANGSMITH_ORG_ID;
  const projectId = process.env.LANGSMITH_PROJECT_ID || process.env.LANGCHAIN_PROJECT;
  const baseUrl = process.env.LANGSMITH_BASE_URL;

  // Only return config if at least org ID or project ID is set
  if (!orgId && !projectId) {
    return undefined;
  }

  return {
    baseUrl,
    orgId,
    projectId,
  };
}

/**
 * Collects trace IDs from experiments for trace link generation.
 *
 * @param experiments - Array of ran experiments containing run data
 * @param traceBaseUrl - Optional base URL for trace viewing
 * @param projectId - Optional project ID for trace viewing
 * @returns TraceLinkInfo with collected trace IDs
 */
export function collectTraceLinkInfo(
  experiments: RanExperiment[],
  traceBaseUrl?: string,
  projectId?: string
): TraceLinkInfo {
  const traceIdsByDataset = new Map<string, string[]>();
  let totalTraceCount = 0;

  for (const experiment of experiments) {
    const datasetName = experiment.datasetName;
    const traceIds: string[] = [];

    if (experiment.runs) {
      for (const run of Object.values(experiment.runs)) {
        // Try to get trace ID from evalThreadId
        if (run.evalThreadId && validateTraceId(run.evalThreadId)) {
          traceIds.push(run.evalThreadId);
        }
      }
    }

    if (traceIds.length > 0) {
      traceIdsByDataset.set(datasetName, traceIds);
      totalTraceCount += traceIds.length;
    }
  }

  // Get LangSmith config from environment
  const langsmith = getLangSmithConfig();

  return {
    traceIdsByDataset,
    totalTraceCount,
    traceBaseUrl,
    projectId,
    langsmith,
  };
}

/**
 * Generates a LangSmith trace URL for viewing a specific trace/run.
 * The URL format opens the trace in the sidebar panel.
 *
 * @param traceId - The trace ID (run ID) to view
 * @param langsmithConfig - LangSmith configuration
 * @returns URL string or undefined if not configured
 */
export function generateLangSmithTraceUrl(
  traceId: string,
  langsmithConfig: TraceLinkInfo['langsmith']
): string | undefined {
  if (!langsmithConfig) {
    return undefined;
  }

  const baseUrl = (langsmithConfig.baseUrl || 'https://smith.langchain.com').replace(/\/$/, '');

  // If we have org ID and project ID, use the full org-scoped URL with selectedSessionId to open in sidebar
  if (langsmithConfig.orgId && langsmithConfig.projectId) {
    return `${baseUrl}/o/${langsmithConfig.orgId}/projects/p/${langsmithConfig.projectId}?peek=${traceId}`;
  }

  // If we only have project ID, use a simpler URL format
  if (langsmithConfig.projectId) {
    return `${baseUrl}/projects/${langsmithConfig.projectId}?peek=${traceId}`;
  }

  // Fallback to public trace URL
  return `${baseUrl}/public/${traceId}`;
}

/**
 * Generates a LangSmith project URL with optional filter.
 *
 * @param langsmithConfig - LangSmith configuration
 * @param filter - Optional filter string (e.g., run name, metadata filter)
 * @returns URL string or undefined if not configured
 */
export function generateLangSmithProjectUrl(
  langsmithConfig: TraceLinkInfo['langsmith'],
  filter?: string
): string | undefined {
  if (!langsmithConfig || !langsmithConfig.projectId) {
    return undefined;
  }

  const baseUrl = (langsmithConfig.baseUrl || 'https://smith.langchain.com').replace(/\/$/, '');

  let url: string;
  if (langsmithConfig.orgId) {
    url = `${baseUrl}/o/${langsmithConfig.orgId}/projects/p/${langsmithConfig.projectId}`;
  } else {
    url = `${baseUrl}/projects/${langsmithConfig.projectId}`;
  }

  // Add filter query param if provided
  if (filter) {
    url += `?filter=${encodeURIComponent(filter)}`;
  }

  return url;
}

/**
 * Generates a trace URL for viewing a specific trace.
 *
 * @param traceId - The trace ID to view
 * @param traceLinkInfo - Trace link configuration
 * @returns URL string or undefined if base URL is not configured
 */
export function generateTraceUrl(
  traceId: string,
  traceLinkInfo: TraceLinkInfo
): string | undefined {
  if (!traceLinkInfo.traceBaseUrl) {
    return undefined;
  }

  const baseUrl = traceLinkInfo.traceBaseUrl.replace(/\/$/, '');

  // Phoenix-style URL
  if (traceLinkInfo.projectId) {
    return `${baseUrl}/projects/${traceLinkInfo.projectId}/traces/${traceId}?selected`;
  }

  // Generic trace URL (APM-style)
  return `${baseUrl}/traces/${traceId}`;
}

function getTaskRun(evalRun: EvaluationRun, runs: RanExperiment['runs']): TaskRun {
  return runs[evalRun.experimentRunId];
}

/**
 * Maps ran experiments to evaluation score documents for Elasticsearch export.
 */
export async function mapToEvaluationScoreDocuments({
  experiments,
  taskModel,
  evaluatorModel,
  runId,
  totalRepetitions,
}: {
  experiments: RanExperiment[];
  taskModel: Model;
  evaluatorModel: Model;
  runId: string;
  totalRepetitions: number;
  /** Optional base URL for trace viewing (e.g., Phoenix UI URL) - use buildEvaluationReport for trace link info */
  traceBaseUrl?: string;
  /** Optional project ID for trace viewing (used by Phoenix/Langfuse) - use buildEvaluationReport for trace link info */
  projectId?: string;
}): Promise<EvaluationScoreDocument[]> {
  const documents: EvaluationScoreDocument[] = [];
  const timestamp = new Date().toISOString();
  const gitMetadata = getGitMetadata();
  const hostName = hostname();

  for (const experiment of experiments) {
    const { datasetId, evaluationRuns, runs = {} } = experiment;
    if (!evaluationRuns) {
      continue;
    }

    const datasetName = experiment.datasetName ?? datasetId;

    for (const evalRun of evaluationRuns) {
      const taskRun = getTaskRun(evalRun, runs);
      const exampleId = evalRun.exampleId ?? String(taskRun.exampleIndex);

      documents.push({
        '@timestamp': timestamp,
        run_id: runId,
        experiment_id: experiment.id ?? '',
        example: {
          id: exampleId,
          index: taskRun.exampleIndex,
          dataset: {
            id: datasetId,
            name: datasetName,
          },
        },
        task: {
          trace_id: taskRun.traceId ?? null,
          repetition_index: taskRun.repetition,
          model: taskModel,
        },
        evaluator: {
          name: evalRun.name,
          score: evalRun.result?.score ?? null,
          label: evalRun.result?.label ?? null,
          explanation: evalRun.result?.explanation ?? null,
          metadata: evalRun.result?.metadata ?? null,
          trace_id: evalRun.traceId ?? null,
          model: evaluatorModel,
        },
        run_metadata: {
          git_branch: gitMetadata.branch,
          git_commit_sha: gitMetadata.commitSha,
          total_repetitions: totalRepetitions,
        },
        environment: {
          hostname: hostName,
        },
      });
    }
  }

  return documents;
}

/**
 * Builds an evaluation report from experiments with dataset scores, stats, and trace link info.
 * Used when reporting from in-memory experiments (without ES export).
 */
export async function buildEvaluationReport({
  experiments,
  taskModel,
  evaluatorModel,
  repetitions,
  runId,
  traceBaseUrl,
  projectId,
}: {
  experiments: RanExperiment[];
  taskModel: Model;
  evaluatorModel: Model;
  repetitions: number;
  runId?: string;
  traceBaseUrl?: string;
  projectId?: string;
}): Promise<EvaluationReport> {
  const { datasetScores } = await buildEvaluationResults(experiments);

  const datasetScoresWithStats: DatasetScoreWithStats[] = datasetScores.map((ds) => ({
    ...ds,
    evaluatorStats: new Map(
      [...ds.evaluatorScores.entries()].map(([name, scores]) => [
        name,
        calculateEvaluatorStats(scores, ds.numExamples),
      ])
    ),
  }));

  const stats: RepositoryEvaluatorStats[] = [];
  for (const ds of datasetScoresWithStats) {
    for (const [evaluatorName, evaluatorStats] of ds.evaluatorStats.entries()) {
      stats.push({
        datasetId: ds.id,
        datasetName: ds.name,
        evaluatorName,
        stats: {
          mean: evaluatorStats.mean,
          median: evaluatorStats.median,
          stdDev: evaluatorStats.stdDev,
          min: evaluatorStats.min,
          max: evaluatorStats.max,
          count: evaluatorStats.count,
        },
      });
    }
  }

  const traceLinkInfo = collectTraceLinkInfo(experiments, traceBaseUrl, projectId);

  return {
    stats,
    model: taskModel,
    evaluatorModel,
    repetitions,
    runId: runId ?? '',
    traceLinkInfo: traceLinkInfo.totalTraceCount > 0 ? traceLinkInfo : undefined,
  };
}

export async function exportEvaluations(
  documents: EvaluationScoreDocument[],
  scoreRepository: EvaluationScoreRepository,
  log: SomeDevLog
): Promise<void> {
  if (documents.length === 0) {
    log.warning('No evaluation scores to export');
    return;
  }

  log.info(chalk.blue('\n═══ EXPORTING TO ELASTICSEARCH ═══'));

  await scoreRepository.exportScores(documents);

  const { run_id: docRunId, task, environment } = documents[0];

  log.info(chalk.green('✅ Evaluation scores exported successfully!'));
  log.info(
    chalk.gray(
      `You can query the data using: environment.hostname:"${environment.hostname}" AND task.model.id:"${task.model.id}" AND run_id:"${docRunId}"`
    )
  );
}
