/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { spawn } from 'child_process';
import { randomBytes } from 'crypto';
import chalk from 'chalk';
import { table } from 'table';
import { createFlagError } from '@kbn/dev-cli-errors';
import type { Command } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';
import { createEsClientForTesting } from '@kbn/test';
import { EvaluationScoreRepository, type EvaluationScoreDocument } from '../../utils/score_repository';
import { resolveEvalSuites } from '../suites';

const DEFAULT_EVALUATIONS_ES_URL = 'http://elastic:changeme@localhost:9200';

const EXECUTORS = ['phoenix', 'kibana'] as const;
type Executor = (typeof EXECUTORS)[number];

const formatEnvPrefix = (overrides: Record<string, string>) =>
  Object.entries(overrides)
    .map(([key, value]) => `${key}=${value}`)
    .join(' ');

const ensureSuite = (suiteId: string, repoRoot: string, log: ToolingLog) => {
  const suites = resolveEvalSuites(repoRoot, log);
  const match = suites.find((suite) => suite.id === suiteId);

  if (match) {
    return match;
  }

  log.info(`Suite "${suiteId}" not found in metadata; refreshing discovery...`);
  const refreshed = resolveEvalSuites(repoRoot, log, { refresh: true });
  const refreshedMatch = refreshed.find((suite) => suite.id === suiteId);

  if (refreshedMatch) {
    return refreshedMatch;
  }

  const available = refreshed.map((suite) => suite.id).join(', ');
  throw createFlagError(
    `Unknown suite "${suiteId}". Available suites: ${available || 'none found'}`
  );
};

const colourScore = (value: number): string => {
  const pct = `${(value * 100).toFixed(0)}%`;
  if (value >= 0.8) return chalk.green(pct);
  if (value >= 0.5) return chalk.yellow(pct);
  return chalk.red(pct);
};

function buildDatasetTable(datasetScores: EvaluationScoreDocument[]): string {
  const evalNames = [...new Set(datasetScores.map((d) => d.evaluator.name))].sort();

  const byModel = new Map<string, EvaluationScoreDocument[]>();
  for (const doc of datasetScores) {
    const modelId = doc.task.model.id ?? doc.task.model.family;
    if (!byModel.has(modelId)) byModel.set(modelId, []);
    byModel.get(modelId)!.push(doc);
  }

  const modelIds = [...byModel.keys()].sort();
  const headers = ['Model', ...evalNames];

  const dataRows = modelIds.map((modelId) => {
    const modelDocs = byModel.get(modelId)!;
    const cells = evalNames.map((evalName) => {
      const evalDocs = modelDocs.filter(
        (d) => d.evaluator.name === evalName && d.evaluator.score != null
      );
      if (evalDocs.length === 0) return chalk.gray('-');
      const mean = evalDocs.reduce((sum, d) => sum + d.evaluator.score!, 0) / evalDocs.length;
      return colourScore(mean);
    });
    return [modelId, ...cells];
  });

  const tableConfig = {
    columns: Object.fromEntries(
      headers.map((_, i) => [i, { alignment: i === 0 ? ('left' as const) : ('right' as const) }])
    ),
  };

  return table([headers, ...dataRows], tableConfig);
}

function buildSummaryTables(scores: EvaluationScoreDocument[]): Array<{ name: string; table: string }> {
  const byDataset = new Map<string, EvaluationScoreDocument[]>();
  for (const doc of scores) {
    const key = doc.example.dataset.name;
    if (!byDataset.has(key)) byDataset.set(key, []);
    byDataset.get(key)!.push(doc);
  }

  return [...byDataset.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, datasetScores]) => ({ name, table: buildDatasetTable(datasetScores) }));
}

async function printSummary(
  runId: string,
  evaluationsEsUrl: string,
  log: ToolingLog
): Promise<void> {
  const esClient = createEsClientForTesting({ esUrl: evaluationsEsUrl });
  const scoreRepository = new EvaluationScoreRepository(esClient, log);

  const scores = await scoreRepository.getScoresByRunId(runId);

  if (scores.length === 0) {
    throw new Error(`No scores found for run ID: ${runId}. Has EVALUATIONS_ES_URL been set?`);
  }

  const firstDoc = scores[0];
  const branch = firstDoc.run_metadata?.git_branch ?? 'unknown';
  const commit = firstDoc.run_metadata?.git_commit_sha?.substring(0, 7) ?? 'unknown';
  const modelCount = new Set(scores.map((d) => d.task.model.id)).size;

  const header = [
    `Run: ${chalk.bold(runId)}`,
    `Branch: ${chalk.cyan(branch)}   Commit: ${chalk.cyan(commit)}`,
    `Models: ${modelCount}   Scores: ${scores.length}`,
  ].join('   ');

  log.info(`\n${header}\n`);

  const datasetTables = buildSummaryTables(scores);
  for (const { name, table: tableStr } of datasetTables) {
    log.info(chalk.bold.blue(`═══ ${name} ═══`));
    log.info(`\n${tableStr}`);
  }
}

export const summaryCmd: Command<void> = {
  name: 'summary',
  description: `
  Run an eval suite and print a multi-model comparison table, or summarise a previous run.

  Mode 1 — run suite then print summary:
    node scripts/evals summary --suite security-ai-rules --evaluation-connector-id gpt-4o

  Mode 2 — summarise an existing run (no re-run):
    node scripts/evals summary <run-id>
  `,
  flags: {
    string: [
      'suite',
      'config',
      'project',
      'executor',
      'evaluation-connector-id',
      'repetitions',
      'trace-es-url',
      'evaluations-es-url',
      'phoenix-base-url',
      'phoenix-api-key',
    ],
    boolean: ['dry-run'],
    default: { 'dry-run': false },
  },
  run: async ({ log, flagsReader }) => {
    const repoRoot = process.cwd();
    const [positionalRunId, ...extraArgs] = flagsReader.getPositionals();

    const evaluationsEsUrl =
      flagsReader.string('evaluations-es-url') ??
      process.env.EVALUATIONS_ES_URL ??
      DEFAULT_EVALUATIONS_ES_URL;

    if (!process.env.EVALUATIONS_ES_URL && !flagsReader.string('evaluations-es-url')) {
      log.warning(`EVALUATIONS_ES_URL not set; defaulting to ${DEFAULT_EVALUATIONS_ES_URL}.`);
    }

    // Mode 2: positional run-id provided — skip running, just print summary
    if (positionalRunId) {
      if (extraArgs.length > 0) {
        throw createFlagError('Unexpected extra arguments. Provide exactly one run ID.');
      }
      await printSummary(positionalRunId, evaluationsEsUrl, log);
      return;
    }

    // Mode 1: run the suite, then print summary
    const suiteId = flagsReader.string('suite');
    const configPath = flagsReader.string('config');
    const executor = flagsReader.enum('executor', EXECUTORS) as Executor | undefined;

    if (!suiteId && !configPath) {
      throw createFlagError(
        'Provide either a run ID (node scripts/evals summary <run-id>) or --suite / --config to run a suite.'
      );
    }

    if (suiteId && configPath) {
      throw createFlagError('Use either --suite or --config, not both.');
    }

    const suite = suiteId ? ensureSuite(suiteId, repoRoot, log) : undefined;
    const resolvedConfigPath = suite
      ? suite.absoluteConfigPath
      : Path.resolve(repoRoot, configPath as string);

    const evaluationConnectorId =
      flagsReader.string('evaluation-connector-id') ?? process.env.EVALUATION_CONNECTOR_ID;

    if (!evaluationConnectorId) {
      throw createFlagError(
        'EVALUATION_CONNECTOR_ID is required. Set --evaluation-connector-id or env.'
      );
    }

    // Generate a run ID upfront so we can query ES after Playwright finishes
    const runId = randomBytes(8).toString('hex');

    const envOverrides: Record<string, string> = {
      EVALUATION_CONNECTOR_ID: evaluationConnectorId,
      EVALUATIONS_ES_URL: evaluationsEsUrl,
      TEST_RUN_ID: runId,
    };

    if (executor === 'phoenix') {
      envOverrides.KBN_EVALS_EXECUTOR = 'phoenix';
    }

    const repetitions = flagsReader.string('repetitions');
    if (repetitions) {
      envOverrides.EVALUATION_REPETITIONS = repetitions;
    }

    const traceEsUrl = flagsReader.string('trace-es-url');
    if (traceEsUrl) {
      envOverrides.TRACING_ES_URL = traceEsUrl;
    }

    const phoenixBaseUrl = flagsReader.string('phoenix-base-url');
    if (phoenixBaseUrl) {
      envOverrides.PHOENIX_BASE_URL = phoenixBaseUrl;
    }

    const phoenixApiKey = flagsReader.string('phoenix-api-key');
    if (phoenixApiKey) {
      envOverrides.PHOENIX_API_KEY = phoenixApiKey;
    }

    const args = ['scripts/playwright', 'test', '--config', resolvedConfigPath];
    const project = flagsReader.string('project');
    if (project) {
      args.push('--project', project);
    }

    const commandPreview = `${formatEnvPrefix(envOverrides)} node ${args.join(' ')}`.trim();
    log.info(`Run ID: ${chalk.bold(runId)}`);
    log.info(`Running: ${commandPreview}`);

    if (flagsReader.boolean('dry-run')) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const child = spawn('node', args, {
        cwd: repoRoot,
        stdio: 'inherit',
        env: { ...process.env, ...envOverrides },
      });

      child.on('exit', (code) => {
        if (code === 0) {
          resolve();
          return;
        }
        // Resolve even on non-zero exit so we still print whatever scores were exported
        log.warning(`Playwright exited with code ${code}. Printing partial results if available.`);
        resolve();
      });

      child.on('error', reject);
    });

    await printSummary(runId, evaluationsEsUrl, log);
  },
};
