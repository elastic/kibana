/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import { Client as EsClient } from '@elastic/elasticsearch';
import { createFlagError } from '@kbn/dev-cli-errors';
import type { Command } from '@kbn/dev-cli-runner';
import { EvaluationScoreRepository } from '../../utils/score_repository';
import { calibrateThresholds } from '../../quality_gates/calibrate';
import { parseGateConfig, serializeGateConfig } from '../../quality_gates/types';

export const calibrateCmd: Command<void> = {
  name: 'calibrate',
  description: `
  Auto-calibrate quality gate thresholds from a completed eval run.

  Examples:
    node scripts/evals calibrate --run-id abc123
    node scripts/evals calibrate --run-id abc123 --config existing.json --output thresholds.json
    node scripts/evals calibrate --run-id abc123 --mode bootstrap --margin 1.5
  `,
  flags: {
    string: ['run-id', 'config', 'output', 'mode', 'margin', 'model', 'suite'],
    default: { mode: 'bootstrap', margin: '2' },
  },
  run: async ({ log, flagsReader }) => {
    const runId = flagsReader.string('run-id');
    if (!runId) {
      throw createFlagError('Missing --run-id <id>');
    }

    const mode = flagsReader.string('mode') ?? 'bootstrap';
    if (mode !== 'bootstrap' && mode !== 'tighten') {
      throw createFlagError('--mode must be "bootstrap" or "tighten"');
    }

    const marginRaw = flagsReader.string('margin') ?? '2';
    const margin = parseFloat(marginRaw);
    if (!Number.isFinite(margin) || margin < 0) {
      throw createFlagError('--margin must be a non-negative number');
    }

    const configPath = flagsReader.string('config');
    let existingConfig;
    if (configPath) {
      const resolved = Path.resolve(process.cwd(), configPath);
      if (!Fs.existsSync(resolved)) {
        throw createFlagError(`Config file not found: ${resolved}`);
      }
      const raw = Fs.readFileSync(resolved, 'utf-8');
      existingConfig = parseGateConfig(raw);
    }

    const esUrl = process.env.EVALUATIONS_ES_URL ?? process.env.ES_URL ?? 'http://localhost:9200';
    const esApiKey = process.env.EVALUATIONS_ES_API_KEY ?? process.env.ES_API_KEY;

    const esClient = new EsClient({
      node: esUrl,
      ...(esApiKey ? { auth: { apiKey: esApiKey } } : {}),
    });

    const repository = new EvaluationScoreRepository(esClient, log);

    log.info(`Calibrating thresholds from run "${runId}" (mode=${mode}, margin=${margin})`);

    const result = await calibrateThresholds(repository, log, {
      runId,
      existingConfig,
      mode: mode as 'bootstrap' | 'tighten',
      margin,
      taskModelId: flagsReader.string('model'),
      suiteId: flagsReader.string('suite'),
    });

    const outputPath = flagsReader.string('output');
    if (outputPath) {
      const resolved = Path.resolve(process.cwd(), outputPath);
      Fs.writeFileSync(resolved, serializeGateConfig(result.config), 'utf-8');
      log.info(`Wrote calibrated config to ${resolved}`);
    } else {
      process.stdout.write(`${serializeGateConfig(result.config)}\n`);
    }

    if (result.changes.length > 0) {
      log.info(`Changes (${result.changes.length}):`);
      for (const change of result.changes) {
        const prev = change.previous !== undefined ? ` (was ${change.previous})` : '';
        log.info(`  ${change.evaluator}: ${change.recommended}${prev} — ${change.reason}`);
      }
    } else {
      log.info('No threshold changes needed.');
    }

    await esClient.close();
  },
};
