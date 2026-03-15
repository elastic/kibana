/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import Fs from 'fs';
import { spawnSync } from 'child_process';
import type { Command } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';
import { DOMAIN_PLUGIN_PATHS } from '../../constants';
import type { SkillDomain } from '../../constants';
import { validateSkillName, validateDomain, toSnakeCase, resolveRepoRoot } from '../../utils';

function findEvalSuiteConfig(repoRoot: string, pluginPath: string, skillName: string): string | null {
  const snakeName = toSnakeCase(skillName);
  const candidates = [
    Path.join(repoRoot, pluginPath, 'skills', '__evals__', `${snakeName}_eval_dataset.ts`),
    Path.join(repoRoot, pluginPath, 'skills', '__evals__', `${snakeName}.eval.ts`),
  ];

  for (const candidate of candidates) {
    if (Fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

export const evalRunCmd: Command<void> = {
  name: 'eval:run',
  description: `
  Run evaluations for an Agent Builder skill against one or more LLM connectors.
  Integrates with @kbn/evals to run the evaluation suite and report metrics.

  Supports phase gate measurements:
    Phase 1: ES skills >= 80% first-try success
    Phase 2: Solution skills >= 60% e2e completion
    Phase 3: Overall eval >= 85% aggregate pass rate

  Examples:
    node scripts/agent_builder_skill eval:run --name alert-triage --domain security
    node scripts/agent_builder_skill eval:run --name alert-triage --domain security --connector-id bedrock-claude
    node scripts/agent_builder_skill eval:run --domain security --metric first-try
  `,
  flags: {
    string: ['name', 'domain', 'connector-id', 'metric'],
    boolean: ['baseline'],
    default: { baseline: false, metric: 'overall' },
    help: `
      --name            Skill name [required]
      --domain          Skill domain [required]
      --connector-id    LLM connector ID for evaluation (uses EVALUATION_CONNECTOR_ID env if unset)
      --metric          Metric to report: first-try, e2e, overall (default: overall)
      --baseline        Compare with/without skill (A/B evaluation)
    `,
  },
  run: async ({ log, flagsReader }) => {
    const name = flagsReader.string('name');
    const domain = flagsReader.string('domain');
    const connectorId = flagsReader.string('connector-id') || process.env.EVALUATION_CONNECTOR_ID;
    const metric = flagsReader.string('metric') || 'overall';
    const baseline = flagsReader.boolean('baseline');

    if (!name) {
      throw createFlagError('--name is required');
    }
    if (!domain) {
      throw createFlagError('--domain is required');
    }

    validateSkillName(name);
    validateDomain(domain);

    const repoRoot = resolveRepoRoot();
    const pluginPath = DOMAIN_PLUGIN_PATHS[domain as SkillDomain];
    const evalConfig = findEvalSuiteConfig(repoRoot, pluginPath, name);

    if (!evalConfig) {
      throw new Error(
        `No eval dataset found for skill "${name}" in domain "${domain}".\n` +
          `Run "eval:generate" first to create one.`
      );
    }

    log.info(`Running evaluations for skill "${name}" in domain "${domain}"...`);
    log.info(`  Eval dataset: ${Path.relative(repoRoot, evalConfig)}`);
    log.info(`  Metric: ${metric}`);
    if (connectorId) {
      log.info(`  Connector: ${connectorId}`);
    }
    if (baseline) {
      log.info(`  Mode: A/B comparison (with/without skill)`);
    }

    const phaseGates: Record<string, Record<string, number>> = {
      security: { 'first-try': 0.8, e2e: 0.6, overall: 0.85 },
      observability: { 'first-try': 0.8, e2e: 0.6, overall: 0.85 },
      platform: { 'first-try': 0.8, e2e: 0.6, overall: 0.85 },
      search: { 'first-try': 0.8, e2e: 0.6, overall: 0.85 },
    };

    const threshold = phaseGates[domain]?.[metric] ?? 0.85;
    log.info(`  Phase gate threshold: ${(threshold * 100).toFixed(0)}%`);
    log.info('');

    const evalsScriptExists = Fs.existsSync(Path.join(repoRoot, 'scripts', 'evals.js'));

    if (!evalsScriptExists) {
      log.warning('The @kbn/evals CLI is not available in this branch.');
      log.info('To run evaluations, ensure @kbn/evals is set up:');
      log.info('  node scripts/evals init');
      log.info('');
      log.info('Performing dry-run validation of the eval dataset...');

      const datasetContent = Fs.readFileSync(evalConfig, 'utf-8');
      const taskMatches = datasetContent.match(/id:\s*'[^']+'/g);
      const taskCount = taskMatches?.length ?? 0;

      log.info(`  Dataset contains ${taskCount} task(s)`);

      const hasTodos = datasetContent.includes("'TODO:");
      if (hasTodos) {
        log.warning('  Dataset contains TODO placeholders — edit them before running real evaluations');
      }

      log.info('');
      log.info('Dry-run complete. To run real evaluations:');
      log.info('  1. Set up connectors: node scripts/evals init');
      log.info(`  2. Run: EVALUATION_CONNECTOR_ID=<id> node scripts/agent_builder_skill eval:run --name ${name} --domain ${domain}`);
      return;
    }

    const env = {
      ...process.env,
      ...(connectorId ? { EVALUATION_CONNECTOR_ID: connectorId } : {}),
    };

    log.info('Delegating to @kbn/evals runner...');
    const result = spawnSync(
      'node',
      [
        '--no-experimental-require-module',
        'scripts/evals',
        'run',
        '--suite',
        `agent-builder-${name}`,
        ...(connectorId ? ['--evaluation-connector-id', connectorId] : []),
      ],
      {
        cwd: repoRoot,
        stdio: 'inherit',
        env,
      }
    );

    if (result.status !== 0) {
      log.error(`Evaluation run failed with exit code ${result.status}`);
      process.exitCode = 1;
    }
  },
};
