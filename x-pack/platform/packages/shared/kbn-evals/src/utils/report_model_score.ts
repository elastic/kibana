/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import type { Model } from '@kbn/inference-common';
import type { Client as EsClient } from '@elastic/elasticsearch';
import chalk from 'chalk';
import { hostname } from 'os';
import {
  EvaluationScoreRepository,
  type EvaluationScoreDocument,
  parseScoreDocuments,
} from './score_repository';
import { buildEvaluationResults, calculateEvaluatorStats } from './evaluation_stats';
import type { EvaluationReport, RanExperiment, TraceLinkInfo } from '../types';
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

export async function buildEvaluationReport({
  experiments,
  model,
  evaluatorModel,
  repetitions,
  runId,
  traceBaseUrl,
  projectId,
}: {
  experiments: RanExperiment[];
  model: Model;
  evaluatorModel: Model;
  repetitions: number;
  runId?: string;
  /** Optional base URL for trace viewing (e.g., Phoenix UI URL) */
  traceBaseUrl?: string;
  /** Optional project ID for trace viewing (used by Phoenix/Langfuse) */
  projectId?: string;
}): Promise<EvaluationReport> {
  const { datasetScores } = await buildEvaluationResults(experiments);

  const datasetScoresWithStats = datasetScores.map((dataset) => ({
    ...dataset,
    evaluatorStats: new Map(
      Array.from(dataset.evaluatorScores.entries()).map(([evaluatorName, scores]) => {
        const stats = calculateEvaluatorStats(scores, dataset.numExamples);
        return [evaluatorName, stats];
      })
    ),
  }));

  const currentRunId = runId || process.env.TEST_RUN_ID;

  if (!currentRunId) {
    throw new Error(
      'runId must be provided either as a parameter or via TEST_RUN_ID environment variable'
    );
  }

  // Collect trace link information
  const traceLinkInfo = collectTraceLinkInfo(experiments, traceBaseUrl, projectId);

  return {
    datasetScoresWithStats,
    model,
    evaluatorModel,
    repetitions,
    runId: currentRunId,
    traceLinkInfo: traceLinkInfo.totalTraceCount > 0 ? traceLinkInfo : undefined,
  };
}

export async function exportEvaluations(
  report: EvaluationReport,
  esClient: EsClient,
  log: SomeDevLog
): Promise<void> {
  if (report.datasetScoresWithStats.length === 0) {
    log.warning('No dataset scores available to export to Elasticsearch');
    return;
  }

  log.info(chalk.blue('\n═══ EXPORTING TO ELASTICSEARCH ═══'));

  const exporter = new EvaluationScoreRepository(esClient, log);

  await exporter.exportScores({
    datasetScoresWithStats: report.datasetScoresWithStats,
    model: report.model,
    evaluatorModel: report.evaluatorModel,
    runId: report.runId,
    repetitions: report.repetitions,
  });

  const modelId = report.model.id || 'unknown';

  log.info(chalk.green('✅ Model scores exported to Elasticsearch successfully!'));
  log.info(
    chalk.gray(
      `You can query the data using: environment.hostname:"${hostname()}" AND model.id:"${modelId}" AND run_id:"${report.runId
      }"`
    )
  );
}

export function formatReportData(scores: EvaluationScoreDocument[]): EvaluationReport {
  if (scores.length === 0) {
    throw new Error('No documents to format');
  }

  const scoresWithStats = parseScoreDocuments(scores);

  const repetitions = scores[0].repetitions ?? 1;

  return {
    datasetScoresWithStats: scoresWithStats,
    model: scores[0].model as Model,
    evaluatorModel: scores[0].evaluator_model as Model,
    repetitions,
    runId: scores[0].run_id,
  };
}
