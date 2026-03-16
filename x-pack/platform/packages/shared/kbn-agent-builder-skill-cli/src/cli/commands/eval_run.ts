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
import type { ToolingLog } from '@kbn/tooling-log';
import { DOMAIN_PLUGIN_PATHS } from '../../constants';
import {
  validateSkillName,
  validateDomain,
  toSnakeCase,
  resolveRepoRoot,
  findSkillFile,
} from '../../utils';

function findEvalSuiteConfig(
  repoRoot: string,
  pluginPath: string,
  skillName: string
): string | null {
  const snakeName = toSnakeCase(skillName);
  const skillFile = findSkillFile(repoRoot, pluginPath, skillName);
  const skillDir = skillFile ? Path.dirname(skillFile) : null;

  const candidates: string[] = [];
  const skillsDir = Path.join(repoRoot, pluginPath, 'skills');

  if (skillDir) {
    candidates.push(
      Path.join(skillDir, '__evals__', `${snakeName}_eval_dataset.ts`),
      Path.join(skillDir, '__evals__', `${snakeName}.eval.ts`)
    );
  }

  if (!skillDir || skillDir !== skillsDir) {
    candidates.push(
      Path.join(skillsDir, '__evals__', `${snakeName}_eval_dataset.ts`),
      Path.join(skillsDir, '__evals__', `${snakeName}.eval.ts`)
    );
  }

  for (const candidate of candidates) {
    if (Fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function runEvaluation(
  repoRoot: string,
  name: string,
  domain: string,
  connectorId: string | undefined,
  metric: string,
  threshold: number,
  evalConfig: string,
  log: ToolingLog
): boolean {
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
      log.warning(
        '  Dataset contains TODO placeholders — edit them before running real evaluations'
      );
    }

    log.info('');
    log.info('Dry-run complete. To run real evaluations:');
    log.info('  1. Set up connectors: node scripts/evals init');
    log.info(
      `  2. Run: EVALUATION_CONNECTOR_ID=<id> node scripts/agent_builder_skill eval:run --name ${name} --domain ${domain}`
    );
    return true;
  }

  const env = {
    ...process.env,
    ...(connectorId ? { EVALUATION_CONNECTOR_ID: connectorId } : {}),
  };

  log.info('Delegating to @kbn/evals runner...');
  const result = spawnSync(
    'node',
    [
      'scripts/evals',
      'run',
      '--suite',
      `agent-builder-${name}`,
      ...(connectorId ? ['--evaluation-connector-id', connectorId] : []),
    ],
    {
      cwd: repoRoot,
      stdio: ['inherit', 'pipe', 'inherit'],
      env,
    }
  );

  const stdout = result.stdout?.toString() ?? '';
  if (stdout.length > 0) {
    process.stdout.write(stdout);
  }

  if (result.status !== 0) {
    const exitInfo = result.signal
      ? `killed by signal ${result.signal}`
      : `exit code ${result.status}`;
    log.error(`Evaluation run failed with ${exitInfo}`);
    return false;
  }

  try {
    const jsonMatch = stdout.match(/\{[\s\S]*"scores"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const scores = parsed.scores ?? parsed.aggregateScores ?? {};
      const metricScore = scores[metric] ?? scores.overall ?? null;

      log.info('');
      log.info('--- Results Summary ---');
      for (const [key, val] of Object.entries(scores)) {
        const pct = ((val as number) * 100).toFixed(1);
        const passIcon = (val as number) >= threshold ? '✓' : '✗';
        log.info(`  ${passIcon} ${key}: ${pct}% (threshold: ${(threshold * 100).toFixed(0)}%)`);
      }

      if (metricScore !== null && metricScore < threshold) {
        log.warning(
          `\nBelow threshold: ${metric} = ${((metricScore as number) * 100).toFixed(1)}% < ${(
            threshold * 100
          ).toFixed(0)}%`
        );
        return false;
      }
    }
  } catch {
    // stdout wasn't JSON-parseable — the raw output was already printed
  }

  return true;
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
    node scripts/agent_builder_skill eval:run --name alert-triage --domain security --watch
  `,
  flags: {
    string: ['name', 'domain', 'connector-id', 'metric'],
    boolean: ['watch'],
    default: { metric: 'overall', watch: false },
    help: `
      --name            Skill name [required]
      --domain          Skill domain [required]
      --connector-id    LLM connector ID for evaluation (uses EVALUATION_CONNECTOR_ID env if unset)
      --metric          Metric to report: first-try, e2e, overall (default: overall)
      --watch           Re-run evaluations when skill or eval files change
    `,
  },
  run: async ({ log, flagsReader }) => {
    const name = flagsReader.string('name');
    const domain = flagsReader.string('domain');
    const connectorId = flagsReader.string('connector-id') || process.env.EVALUATION_CONNECTOR_ID;
    const metric = flagsReader.string('metric') || 'overall';
    const watch = flagsReader.boolean('watch');

    if (!name) {
      throw createFlagError('--name is required');
    }
    if (!domain) {
      throw createFlagError('--domain is required');
    }

    validateSkillName(name);
    validateDomain(domain);

    const repoRoot = resolveRepoRoot();
    const pluginPath = DOMAIN_PLUGIN_PATHS[domain];
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

    const phaseGates: Record<string, Record<string, number>> = {
      security: { 'first-try': 0.8, e2e: 0.6, overall: 0.85 },
      observability: { 'first-try': 0.8, e2e: 0.6, overall: 0.85 },
      platform: { 'first-try': 0.8, e2e: 0.6, overall: 0.85 },
    };

    const threshold = phaseGates[domain]?.[metric] ?? 0.85;
    log.info(`  Phase gate threshold: ${(threshold * 100).toFixed(0)}%`);
    log.info('');

    const passed = runEvaluation(
      repoRoot,
      name,
      domain,
      connectorId,
      metric,
      threshold,
      evalConfig,
      log
    );

    if (!passed) {
      process.exitCode = 1;
    }

    if (watch) {
      log.info('');
      log.info('Watching for file changes... (Ctrl+C to stop)');

      const skillFile = findSkillFile(repoRoot, pluginPath, name);
      const watchPaths = [evalConfig];
      if (skillFile) watchPaths.push(skillFile);

      const evalDir = Path.dirname(evalConfig);
      let debounceTimer: ReturnType<typeof setTimeout> | null = null;

      const onChange = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          log.info('\n--- File change detected, re-running evaluations ---\n');
          const watchPassed = runEvaluation(
            repoRoot,
            name,
            domain,
            connectorId,
            metric,
            threshold,
            evalConfig,
            log
          );
          if (!watchPassed) {
            process.exitCode = 1;
          }
        }, 1000);
      };

      for (const watchPath of watchPaths) {
        Fs.watch(watchPath, onChange);
      }
      if (Fs.existsSync(evalDir)) {
        Fs.watch(evalDir, onChange);
      }

      await new Promise(() => {});
    }
  },
};
