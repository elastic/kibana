/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import type { Command } from '@kbn/dev-cli-runner';
import { resolveEvalSuites } from '../suites';
import { analyzeCoverage } from '../../coverage/analyzer';
import { parseGateConfig } from '../../quality_gates/types';

export const coverageCmd: Command<void> = {
  name: 'coverage',
  description: `
  Analyze eval suite coverage against tools and evaluators.

  Examples:
    node scripts/evals coverage
    node scripts/evals coverage --tools tool1,tool2 --evaluators criteria,correctness
    node scripts/evals coverage --gate-config thresholds.json --json
  `,
  flags: {
    string: ['tools', 'evaluators', 'gate-config'],
    boolean: ['json'],
    default: { json: false },
  },
  run: async ({ log, flagsReader }) => {
    const repoRoot = process.cwd();

    const toolsRaw = flagsReader.string('tools');
    const toolIds = toolsRaw ? toolsRaw.split(',').map((t) => t.trim()) : [];

    const evaluatorsRaw = flagsReader.string('evaluators');
    const evaluatorNames = evaluatorsRaw ? evaluatorsRaw.split(',').map((e) => e.trim()) : [];

    const gateConfigPath = flagsReader.string('gate-config');
    let gateConfig;
    if (gateConfigPath) {
      const resolved = Path.resolve(repoRoot, gateConfigPath);
      if (!Fs.existsSync(resolved)) {
        log.error(`Gate config file not found: ${resolved}`);
        process.exitCode = 1;
        return;
      }
      const raw = Fs.readFileSync(resolved, 'utf-8');
      gateConfig = parseGateConfig(raw);
    }

    const suites = resolveEvalSuites(repoRoot, log);
    log.info(`Found ${suites.length} eval suite(s)`);

    const report = analyzeCoverage({
      repoRoot,
      log,
      toolIds,
      evaluatorNames,
      gateConfig,
      suites,
    });

    if (flagsReader.boolean('json')) {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      return;
    }

    log.info(`Tool coverage: ${report.overallToolCoveragePercent.toFixed(1)}%`);
    for (const entry of report.toolCoverage) {
      const status = entry.coveredBy.length > 0 ? 'covered' : 'MISSING';
      log.info(`  ${entry.toolId}: ${status} (${entry.coveredBy.join(', ') || 'none'})`);
    }

    log.info(`Evaluator coverage: ${report.overallEvaluatorCoveragePercent.toFixed(1)}%`);
    for (const entry of report.evaluatorCoverage) {
      const status = entry.usedIn.length > 0 ? 'used' : 'UNUSED';
      log.info(`  ${entry.evaluatorName}: ${status} (${entry.usedIn.join(', ') || 'none'})`);
    }

    if (report.gaps.length > 0) {
      log.warning(`Gaps (${report.gaps.length}):`);
      for (const gap of report.gaps) {
        log.warning(`  - ${gap}`);
      }
    }

    if (report.gateReadiness) {
      log.info('Gate readiness:');
      for (const entry of report.gateReadiness) {
        const status = entry.meetsThreshold ? 'PASS' : 'FAIL';
        log.info(
          `  ${entry.evaluator}: ${status} (actual=${entry.actual.toFixed(
            3
          )}, required=${entry.required.toFixed(3)})`
        );
      }
    }
  },
};
