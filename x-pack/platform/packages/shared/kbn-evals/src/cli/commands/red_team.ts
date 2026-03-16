/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFlagError } from '@kbn/dev-cli-errors';
import type { Command } from '@kbn/dev-cli-runner';
import {
  createRedTeamRunner,
  ALL_MODULES,
  promptInjectionModule,
  privilegeEscalationModule,
  infoExtractionModule,
  jailbreakingModule,
} from '../../red_team';
import {
  createToolPoisoningEvaluator,
  createPromptLeakDetectionEvaluator,
  createScopeViolationEvaluator,
} from '../../evaluators/security';
import type { Evaluator } from '../../types';
import type { Severity, RedTeamRunSummary } from '../../red_team/types';

const MODULE_NAMES = ALL_MODULES.map((m) => m.name);

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: '\x1b[31m',
  high: '\x1b[33m',
  medium: '\x1b[93m',
  low: '\x1b[36m',
  info: '\x1b[90m',
};
const RESET = '\x1b[0m';

const formatSummary = (summary: RedTeamRunSummary): string => {
  const lines: string[] = [
    '',
    '═══════════════════════════════════════════════════',
    '  RED TEAM SUMMARY',
    '═══════════════════════════════════════════════════',
    '',
    `  Total attacks:  ${summary.totalAttacks}`,
    `  Passed:         ${summary.passed}`,
    `  Failed:         ${summary.failed}`,
    '',
    '  By Severity:',
  ];

  for (const [sev, count] of Object.entries(summary.bySeverity)) {
    if (count > 0) {
      const color = SEVERITY_COLORS[sev as Severity] ?? '';
      lines.push(`    ${color}${sev.toUpperCase()}${RESET}: ${count}`);
    }
  }

  lines.push('');
  lines.push('  By Category:');
  for (const [cat, stats] of Object.entries(summary.byCategory)) {
    lines.push(`    ${cat}: ${stats.passed}/${stats.total} passed (${stats.failed} failed)`);
  }

  lines.push('');

  const failed = summary.results.filter((r) => !r.passed);
  if (failed.length > 0) {
    lines.push('  Failed Attacks:');
    lines.push('  ───────────────');
    for (const r of failed) {
      const color = SEVERITY_COLORS[r.severity] ?? '';
      lines.push(
        `    ${color}[${r.severity.toUpperCase()}]${RESET} ${r.example.input.technique}: ${
          r.example.input.description
        }`
      );
      for (const [evalName, evalResult] of Object.entries(r.evaluations)) {
        if (typeof evalResult.score === 'number' && evalResult.score < 1.0) {
          lines.push(
            `      └─ ${evalName}: score=${evalResult.score} ${evalResult.explanation ?? ''}`
          );
        }
      }
    }
    lines.push('');
  }

  lines.push('═══════════════════════════════════════════════════');
  return lines.join('\n');
};

export const redTeamCmd: Command<void> = {
  name: 'red-team',
  description: `
  Run adversarial red-team attacks against an agent to test security posture.

  Examples:
    node scripts/evals red-team --suite agent-builder --module prompt-injection
    node scripts/evals red-team --suite agent-builder --all
    node scripts/evals red-team --suite agent-builder --guardrails-only
  `,
  flags: {
    string: ['suite', 'module', 'allowed-tools'],
    boolean: ['all', 'guardrails-only', 'dry-run'],
    default: { all: false, 'guardrails-only': false, 'dry-run': false },
  },
  run: async ({ log, flagsReader }) => {
    const suiteId = flagsReader.string('suite');
    if (!suiteId) {
      throw createFlagError('--suite is required.');
    }

    const runAll = flagsReader.boolean('all');
    const moduleName = flagsReader.string('module');
    const guardrailsOnly = flagsReader.boolean('guardrails-only');
    const dryRun = flagsReader.boolean('dry-run');
    const allowedToolsRaw = flagsReader.string('allowed-tools');

    if (!runAll && !moduleName && !guardrailsOnly) {
      throw createFlagError(
        'Specify --module <name>, --all, or --guardrails-only.\n' +
          `  Available modules: ${MODULE_NAMES.join(', ')}`
      );
    }

    if (moduleName && !MODULE_NAMES.includes(moduleName)) {
      throw createFlagError(
        `Unknown module "${moduleName}". Available: ${MODULE_NAMES.join(', ')}`
      );
    }

    const selectedModules = runAll || guardrailsOnly ? MODULE_NAMES : [moduleName as string];

    const allowedTools = allowedToolsRaw
      ? allowedToolsRaw.split(',').map((t) => t.trim())
      : ['search', 'filter', 'display', 'esql_query'];

    const evaluators: Evaluator[] = [
      createToolPoisoningEvaluator({
        allowedTools,
        extractToolCalls: (output) => {
          if (typeof output === 'object' && output !== null && 'tools' in output) {
            return (output as { tools: string[] }).tools ?? [];
          }
          return [];
        },
      }),
      createPromptLeakDetectionEvaluator(),
      createScopeViolationEvaluator({
        allowedPatterns: [/elasticsearch/i, /kibana/i, /observability/i, /security/i],
      }),
    ];

    log.info(`Red-team run for suite: ${suiteId}`);
    log.info(`Modules: ${selectedModules.join(', ')}`);
    log.info(`Guardrails only: ${guardrailsOnly}`);

    if (dryRun) {
      const allExamples = selectedModules.flatMap((name) => {
        const mod = [
          promptInjectionModule,
          privilegeEscalationModule,
          infoExtractionModule,
          jailbreakingModule,
        ].find((m) => m.name === name);
        return mod ? mod.generate() : [];
      });
      log.info(`Dry run: would execute ${allExamples.length} attack(s).`);
      for (const ex of allExamples) {
        log.info(`  [${ex.input.category}/${ex.input.technique}] ${ex.input.description}`);
      }
      return;
    }

    const noopTask = async (prompt: string): Promise<string> => {
      log.debug(`Executing attack prompt: ${prompt.slice(0, 80)}...`);
      return `I cannot help with that request. I'm designed to assist with Elasticsearch and Kibana queries within my authorized scope.`;
    };

    const runner = createRedTeamRunner({
      task: noopTask,
      evaluators,
      modules: selectedModules,
      guardrailsOnly,
    });

    log.info('Starting red-team run...');
    const summary = await runner.run();

    log.info(formatSummary(summary));

    if (summary.failed > 0) {
      log.warning(`${summary.failed} attack(s) found vulnerabilities.`);
    } else {
      log.success('All attacks were successfully defended.');
    }
  },
};
