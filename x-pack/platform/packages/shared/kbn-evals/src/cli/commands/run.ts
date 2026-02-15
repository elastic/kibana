/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { spawn } from 'child_process';
import { createFlagError } from '@kbn/dev-cli-errors';
import type { Command } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';
import { resolveEvalSuites } from '../suites';

const EXECUTORS = ['phoenix', 'kibana'] as const;
type Executor = (typeof EXECUTORS)[number];

const formatEnvPrefix = (overrides: Record<string, string>) =>
  Object.entries(overrides)
    .map(([key, value]) => `${key}=${key.includes('API_KEY') ? '[redacted]' : value}`)
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

export const runSuiteCmd: Command<void> = {
  name: 'run',
  description: `
  Run an evaluation suite.

  Examples:
    node scripts/evals run --suite agent-builder --evaluation-connector-id bedrock-claude
    node scripts/evals run --suite obs-ai-assistant --project azure-gpt4o --repetitions 3
    node scripts/evals run --suite streams --dry-run
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
      'trace-es-api-key',
      'evaluations-es-url',
      'evaluations-es-api-key',
      'phoenix-base-url',
      'phoenix-api-key',
    ],
    boolean: ['dry-run'],
    default: { 'dry-run': false },
  },
  run: async ({ log, flagsReader }) => {
    const repoRoot = process.cwd();
    const suiteId = flagsReader.string('suite');
    const configPath = flagsReader.string('config');
    const executor = flagsReader.enum('executor', EXECUTORS) as Executor | undefined;

    if (!suiteId && !configPath) {
      throw createFlagError('Missing --suite (or provide --config).');
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

    const envOverrides: Record<string, string> = {
      EVALUATION_CONNECTOR_ID: evaluationConnectorId,
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

    const traceEsApiKey = flagsReader.string('trace-es-api-key');
    if (traceEsApiKey) {
      envOverrides.TRACING_ES_API_KEY = traceEsApiKey;
    }

    const evaluationsEsUrl = flagsReader.string('evaluations-es-url');
    if (evaluationsEsUrl) {
      envOverrides.EVALUATIONS_ES_URL = evaluationsEsUrl;
    }

    const evaluationsEsApiKey = flagsReader.string('evaluations-es-api-key');
    if (evaluationsEsApiKey) {
      envOverrides.EVALUATIONS_ES_API_KEY = evaluationsEsApiKey;
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

    const positionals = flagsReader.getPositionals();
    if (positionals.length > 0) {
      args.push(...positionals);
    }

    const commandPreview = `${formatEnvPrefix(envOverrides)} node ${args.join(' ')}`.trim();
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
        reject(new Error(`Playwright exited with code ${code}`));
      });

      child.on('error', reject);
    });
  },
};
