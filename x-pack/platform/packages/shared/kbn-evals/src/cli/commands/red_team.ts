/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawn } from 'child_process';
import { createFlagError } from '@kbn/dev-cli-errors';
import type { Command } from '@kbn/dev-cli-runner';
import { resolveEvalSuites } from '../suites';
import { getAllAvailableConnectors } from '../prompts';
import { getAvailableModules } from '../../red_team/modules';
import { ensureEvalStack, isEisConnectorId } from '../ensure_eval_stack';
import { resolveRunContext } from '../run_context';

const DIFFICULTIES = ['basic', 'moderate', 'advanced'] as const;
const SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;

export const redTeamCmd: Command<void> = {
  name: 'red-team',
  description: `
  Run red-team adversarial testing against an evaluation suite.

  Boots the full eval stack (EDOT collector + Scout server + EIS CCM) as background
  daemons, then runs the suite's red-team specs. Daemons persist between runs; reuse
  them with --skip-server, and stop them with \`node scripts/evals stop\`.

  Requires the suite to expose a dedicated red-team Playwright config registered as
  "<suite>-red-team" in .buildkite/pipelines/evals/evals.suites.json (e.g.
  agent-builder-red-team -> red_team.playwright.config.ts with testDir ./red_team).
  The spec file uses the RedTeamOrchestrator with the suite's task function.

  Examples:
    node scripts/evals red-team --suite agent-builder
    node scripts/evals red-team --suite agent-builder --module prompt-injection
    node scripts/evals red-team --suite agent-builder --strategy jailbreak-wrapper
    node scripts/evals red-team --suite agent-builder --strategy crescendo
    node scripts/evals red-team --suite agent-builder --templates-only
    node scripts/evals red-team --suite agent-builder --count 20 --difficulty advanced
    node scripts/evals red-team --suite agent-builder --judge bedrock-claude
    node scripts/evals red-team --suite agent-builder --skip-server
  `,
  flags: {
    string: [
      'suite',
      'module',
      'strategy',
      'count',
      'difficulty',
      'severity-threshold',
      'evaluation-connector-id',
      'project',
      'profile',
      'datasets-profile',
      'export-profile',
    ],
    boolean: ['templates-only', 'dry-run', 'skip-server'],
    alias: { model: 'project', judge: 'evaluation-connector-id' },
    default: {
      'templates-only': false,
      'dry-run': false,
      'skip-server': false,
    },
  },
  run: async ({ log, flagsReader }) => {
    const repoRoot = process.cwd();
    const suiteId = flagsReader.string('suite');

    if (!suiteId) {
      throw createFlagError('Missing required --suite flag.');
    }

    // Resolve suite. Prefer a dedicated red-team config registered as
    // "<suiteId>-red-team"; fall back to the standard suite config (with
    // --grep) for suites that haven't migrated yet.
    const suites = resolveEvalSuites(repoRoot, log);
    const redTeamSuite = suites.find((s) => s.id === `${suiteId}-red-team`);
    const fallbackSuite = suites.find((s) => s.id === suiteId);
    const suite = redTeamSuite ?? fallbackSuite;
    if (!suite) {
      const available = suites.map((s) => s.id).join(', ');
      throw createFlagError(`Unknown suite "${suiteId}". Available: ${available || 'none found'}`);
    }
    const useDedicatedConfig = Boolean(redTeamSuite);

    // Parse red-team specific flags
    const moduleName = flagsReader.string('module');
    const strategyName = flagsReader.string('strategy');
    const countStr = flagsReader.string('count');
    const count = countStr ? parseInt(countStr, 10) : 10;
    const difficulty =
      (flagsReader.enum('difficulty', [...DIFFICULTIES]) as
        | 'basic'
        | 'moderate'
        | 'advanced'
        | undefined) ?? 'moderate';
    const severityThreshold = flagsReader.enum('severity-threshold', [...SEVERITIES]) ?? 'low';
    const templatesOnly = flagsReader.boolean('templates-only');

    if (countStr && (isNaN(count) || count < 1)) {
      throw createFlagError('--count must be a positive integer.');
    }

    // Build environment overrides for red-team config
    const envOverrides: Record<string, string> = {
      EVAL_SUITE_ID: suiteId,
    };

    // Red-team specific env vars (read by the spec file)
    envOverrides.RED_TEAM_ENABLED = 'true';
    envOverrides.RED_TEAM_COUNT = String(count);
    envOverrides.RED_TEAM_DIFFICULTY = difficulty;
    envOverrides.RED_TEAM_SEVERITY_THRESHOLD = severityThreshold;

    if (moduleName) {
      envOverrides.RED_TEAM_MODULES = moduleName.replace(/-/g, '_');
    }
    if (strategyName) {
      envOverrides.RED_TEAM_STRATEGY = strategyName.replace(/-/g, '_');
    }
    if (templatesOnly) {
      envOverrides.RED_TEAM_TEMPLATES_ONLY = 'true';
    }

    const {
      evaluationConnectorId,
      projects,
      profileEnvOverrides,
    } = await resolveRunContext(repoRoot, log, flagsReader);

    envOverrides.EVALUATION_CONNECTOR_ID = evaluationConnectorId;
    Object.assign(envOverrides, profileEnvOverrides);

    log.info(`Red-team testing suite: ${suiteId}`);
    log.info(`  Modules: ${moduleName?.replace(/-/g, '_') ?? getAvailableModules().join(', ')}`);
    log.info(`  Strategy: ${strategyName ?? 'direct'}`);
    log.info(`  Count: ${count} | Difficulty: ${difficulty} | Templates only: ${templatesOnly}`);

    // Spawn Playwright targeting the suite's red-team spec files. With a
    // dedicated config the testDir already points at the red-team specs;
    // otherwise scope the run with --grep against the shared config.
    const args = ['scripts/playwright', 'test', '--config', suite.absoluteConfigPath];
    if (!useDedicatedConfig) {
      args.push('--grep', 'Red Team');
    }

    for (const p of projects) {
      args.push('--project', p);
    }

    const commandPreview = Object.entries(envOverrides)
      .filter(([key]) => key.startsWith('RED_TEAM'))
      .map(([key, value]) => `${key}=${value}`)
      .join(' ');
    log.info(`Running: ${commandPreview} node ${args.join(' ')}`);

    if (flagsReader.boolean('dry-run')) {
      return;
    }

    // Boot the eval stack (EDOT + Scout + EIS CCM) unless reusing existing services.
    // Daemons persist between runs; stop them with `node scripts/evals stop`.
    const skipServer = flagsReader.boolean('skip-server');
    log.info(`Server:    ${skipServer ? 'skip (using existing)' : 'managed'}`);
    if (!skipServer) {
      const requiresEisCcm =
        isEisConnectorId(evaluationConnectorId) ||
        (projects.length > 0
          ? projects.some(isEisConnectorId)
          : getAllAvailableConnectors(repoRoot).some((c) => isEisConnectorId(c.id)));

      await ensureEvalStack({
        repoRoot,
        log,
        serverConfigSet: suite.serverConfigSet ?? 'evals_tracing',
        requiresEisCcm,
        profileEnvOverrides,
      });
    }

    await new Promise<void>((resolve, reject) => {
      const childEnv: Record<string, string> = {
        ...process.env,
        ...envOverrides,
      } as Record<string, string>;
      delete childEnv.NO_COLOR;

      const child = spawn('node', args, {
        cwd: repoRoot,
        stdio: 'inherit',
        env: childEnv,
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

    if (!skipServer) {
      log.info('');
      log.info('EDOT and Scout are still running in the background.');
      log.info('To stop them: node scripts/evals stop');
    }
  },
};
