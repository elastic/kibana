/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import chalk from 'chalk';
import type { Model } from '@kbn/inference-common';
import type { EvaluationScoreRepository, EvaluationExplanation } from '../score_repository';
import type { DatasetScoreWithStats } from '../evaluation_stats';
import { createTable } from './report_table';
import type { ReportDisplayOptions, TraceLinkInfo } from '../../types';
import {
  formatReportData,
  generateTraceUrl,
  generateLangSmithTraceUrl,
  generateLangSmithProjectUrl,
  getLangSmithConfig,
} from '../report_model_score';
export type EvaluationReporter = (
  scoreRepository: EvaluationScoreRepository,
  runId: string,
  log: SomeDevLog
) => Promise<void>;

function buildReportHeader(taskModel: Model, evaluatorModel: Model): string[] {
  const lines = [`Model: ${taskModel.id} (${taskModel.family}/${taskModel.provider})`];
  lines.push(
    `Evaluator Model: ${evaluatorModel.id} (${evaluatorModel.family}/${evaluatorModel.provider})`
  );
  return lines;
}

/**
 * Score threshold below which we display explanations
 */
const LOW_SCORE_DISPLAY_THRESHOLD = 1.0;

/**
 * Maximum number of explanations to display per evaluator
 */
const MAX_EXPLANATIONS_PER_EVALUATOR = 5;

/**
 * Formats low-scoring evaluation explanations for terminal display.
 *
 * @param datasetScoresWithStats - Dataset scores with explanations
 * @returns Formatted string for terminal display, or empty string if no low scores
 */
function formatLowScoreExplanations(datasetScoresWithStats: DatasetScoreWithStats[]): string {
  const lines: string[] = [];
  let hasLowScores = false;

  for (const dataset of datasetScoresWithStats) {
    const datasetLowScores: string[] = [];

    for (const [evaluatorName, stats] of dataset.evaluatorStats.entries()) {
      // Check if this evaluator has scores below threshold
      if (stats.percentage < LOW_SCORE_DISPLAY_THRESHOLD) {
        const explanations = dataset.evaluatorExplanations?.get(evaluatorName) || [];

        if (explanations.length > 0) {
          hasLowScores = true;

          datasetLowScores.push('');
          datasetLowScores.push(
            chalk.yellow(`  📊 ${evaluatorName}: ${(stats.percentage * 100).toFixed(1)}%`)
          );

          // Display up to MAX_EXPLANATIONS_PER_EVALUATOR explanations
          const displayExplanations = explanations.slice(0, MAX_EXPLANATIONS_PER_EVALUATOR);

          for (const exp of displayExplanations) {
            const scoreStr =
              exp.score !== null ? chalk.red(`${(exp.score * 100).toFixed(0)}%`) : chalk.gray('N/A');

            datasetLowScores.push(chalk.gray(`     ─────────────────────────────────────`));

            // Show input question if available (truncated)
            if (exp.inputQuestion) {
              const truncatedQuestion =
                exp.inputQuestion.length > 100
                  ? exp.inputQuestion.slice(0, 100) + '...'
                  : exp.inputQuestion;
              datasetLowScores.push(chalk.white(`     📝 Input: "${truncatedQuestion}"`));
            }

            datasetLowScores.push(
              chalk.white(`     Example ${exp.exampleIndex}, Rep ${exp.repetition}: `) + scoreStr
            );

            // Show explanation if available
            if (exp.explanation) {
              const truncatedExplanation =
                exp.explanation.length > 300
                  ? exp.explanation.slice(0, 300) + '...'
                  : exp.explanation;
              datasetLowScores.push(chalk.gray(`     💡 ${truncatedExplanation}`));
            }

            // Show reasoning if different from explanation
            if (exp.reasoning && exp.reasoning !== exp.explanation) {
              const truncatedReasoning =
                exp.reasoning.length > 200 ? exp.reasoning.slice(0, 200) + '...' : exp.reasoning;
              datasetLowScores.push(chalk.gray(`     🔍 ${truncatedReasoning}`));
            }

            // Show label if available and informative
            if (exp.label && exp.label !== 'unavailable') {
              datasetLowScores.push(chalk.gray(`     🏷️  Label: ${exp.label}`));
            }
          }

          if (explanations.length > MAX_EXPLANATIONS_PER_EVALUATOR) {
            datasetLowScores.push(
              chalk.gray(
                `     ... and ${explanations.length - MAX_EXPLANATIONS_PER_EVALUATOR} more low-scoring examples`
              )
            );
          }
        }
      }
    }

    if (datasetLowScores.length > 0) {
      lines.push('');
      lines.push(chalk.cyan(`  📁 Dataset: ${dataset.name}`));
      lines.push(...datasetLowScores);
    }
  }

  if (!hasLowScores) {
    return '';
  }

  return [
    chalk.bold.red('═══ LOW SCORE EXPLANATIONS ═══'),
    chalk.gray('Showing explanations for evaluators scoring below 100%:'),
    ...lines,
    '',
  ].join('\n');
}

/**
 * Formats LangSmith links for terminal display when configured via environment variables.
 *
 * @param runId - Optional evaluation run ID to filter traces
 * @returns Formatted string for terminal display, or empty string if not configured
 */
function formatLangSmithLinks(runId?: string): string {
  const langsmithConfig = getLangSmithConfig();

  if (!langsmithConfig) {
    return '';
  }

  const lines: string[] = [];
  lines.push(chalk.bold.blue('═══ LANGSMITH TRACES ═══'));

  // Generate URL with filter for this specific run if we have a runId
  const filter = runId ? `has(metadata, {"run_id":"${runId}"})` : undefined;
  const projectUrl = generateLangSmithProjectUrl(langsmithConfig, filter);

  if (projectUrl) {
    if (runId) {
      lines.push(chalk.cyan(`  📊 View traces for this evaluation run:`));
    } else {
      lines.push(chalk.cyan(`  📊 View all traces in LangSmith:`));
    }
    lines.push(chalk.blue(`     ${projectUrl}`));

    // Also show unfiltered project URL
    if (runId) {
      const allTracesUrl = generateLangSmithProjectUrl(langsmithConfig);
      if (allTracesUrl) {
        lines.push('');
        lines.push(chalk.gray(`  📁 View all project traces:`));
        lines.push(chalk.gray(`     ${allTracesUrl}`));
      }
    }
  } else {
    const baseUrl = langsmithConfig.baseUrl || 'https://smith.langchain.com';
    lines.push(chalk.gray(`  LangSmith Base URL: ${baseUrl}`));
    lines.push(chalk.yellow(`  ⚠️  Set LANGSMITH_PROJECT_ID to generate direct trace links`));
  }

  lines.push('');

  return lines.join('\n');
}

/**
 * Formats trace link information for terminal display.
 *
 * @param traceLinkInfo - Trace link information from the evaluation report
 * @returns Formatted string for terminal display
 */
function formatTraceLinkInfo(traceLinkInfo: TraceLinkInfo): string {
  const lines: string[] = [];

  lines.push(chalk.bold.magenta('═══ TRACE LINKS ═══'));
  lines.push(chalk.gray(`Total traces collected: ${traceLinkInfo.totalTraceCount}`));

  if (traceLinkInfo.traceBaseUrl) {
    lines.push(chalk.gray(`Trace viewer (Phoenix/APM): ${traceLinkInfo.traceBaseUrl}`));
  }

  if (traceLinkInfo.langsmith) {
    const langsmithBase =
      traceLinkInfo.langsmith.baseUrl || 'https://smith.langchain.com';
    lines.push(chalk.gray(`Trace viewer (LangSmith): ${langsmithBase}`));
    if (traceLinkInfo.langsmith.projectId) {
      lines.push(chalk.gray(`LangSmith Project: ${traceLinkInfo.langsmith.projectId}`));
    }
  }

  lines.push('');

  // Display trace IDs grouped by dataset
  for (const [datasetName, traceIds] of traceLinkInfo.traceIdsByDataset.entries()) {
    lines.push(chalk.cyan(`  ${datasetName} (${traceIds.length} traces):`));

    // Show up to 5 trace IDs per dataset, with URLs if available
    const displayCount = Math.min(traceIds.length, 5);
    for (let i = 0; i < displayCount; i++) {
      const traceId = traceIds[i];

      // Show Phoenix/APM URL if configured
      const phoenixUrl = generateTraceUrl(traceId, traceLinkInfo);
      if (phoenixUrl) {
        lines.push(chalk.gray(`    [${i}] Phoenix: ${phoenixUrl}`));
      }

      // Show LangSmith URL if configured
      const langsmithUrl = generateLangSmithTraceUrl(traceId, traceLinkInfo.langsmith);
      if (langsmithUrl) {
        lines.push(chalk.blue(`    [${i}] LangSmith: ${langsmithUrl}`));
      }

      // If neither is configured, just show the trace ID
      if (!phoenixUrl && !langsmithUrl) {
        lines.push(chalk.gray(`    [${i}] ${traceId}`));
      }
    }

    if (traceIds.length > displayCount) {
      lines.push(chalk.gray(`    ... and ${traceIds.length - displayCount} more`));
    }
  }

  return lines.join('\n');
}

export function createDefaultTerminalReporter(
  options: { reportDisplayOptions?: ReportDisplayOptions; showLowScoreExplanations?: boolean } = {}
): EvaluationReporter {
  const { showLowScoreExplanations = true } = options;

  return async (scoreRepository: EvaluationScoreRepository, runId: string, log: SomeDevLog) => {
    const runStats = await scoreRepository.getStatsByRunId(runId);

    if (!runStats || runStats.stats.length === 0) {
      log.error(`No evaluation results found for run ID: ${runId}`);
      return;
    }

    const header = buildReportHeader(runStats.taskModel, runStats.evaluatorModel);
    const summaryTable = createTable(
      runStats.stats,
      runStats.totalRepetitions,
      options.reportDisplayOptions
    );

    log.info(`\n\n${header.join('\n')}`);
    log.info(`\n${chalk.bold.blue('═══ EVALUATION RESULTS ═══')}\n${summaryTable}`);

    // Display low score explanations if enabled
    if (showLowScoreExplanations) {
      const explanationsOutput = formatLowScoreExplanations(report.datasetScoresWithStats);
      if (explanationsOutput) {
        log.info(`\n${explanationsOutput}`);
      }
    }

    // Display LangSmith links if configured via environment variables
    const langsmithOutput = formatLangSmithLinks(runId);
    if (langsmithOutput) {
      log.info(`\n${langsmithOutput}`);
    }

    // Display trace link information if available (from experiment runs)
    if (report.traceLinkInfo && report.traceLinkInfo.totalTraceCount > 0) {
      log.info(`\n${formatTraceLinkInfo(report.traceLinkInfo)}`);
    }
  };
}
