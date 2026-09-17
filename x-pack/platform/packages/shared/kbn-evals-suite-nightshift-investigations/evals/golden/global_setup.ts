/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { EvalsClient, getEvaluationsKbnClient } from '@kbn/evals';
import { KbnClient } from '@kbn/kbn-client';
import { ToolingLog } from '@kbn/tooling-log';
import { getGoldenSourceDatasetName, readGoldenDataset } from './datasets';

/** Snapshots the approved source dataset before Playwright synchronously collects the golden spec. */
async function setupGoldenDataset(): Promise<(() => void) | undefined> {
  if (process.env.NIGHTSHIFT_DATASETS === 'synthetic-smoke') return;
  const sourceDatasetName = getGoldenSourceDatasetName();
  const url = process.env.EVAL_KBN_URL;
  if (!url)
    throw new Error(
      'The golden investigation eval requires EVAL_KBN_URL; select --profile golden.'
    );
  const log = new ToolingLog({ level: 'info', writeTo: process.stdout });
  const kbnClient = getEvaluationsKbnClient({ kbnClient: new KbnClient({ url, log }), log });
  const source = await new EvalsClient(kbnClient, log).getDatasetByName(sourceDatasetName);
  if (!source)
    throw new Error('The configured approved dataset was not found on the selected cluster.');
  const directory = mkdtempSync(join(tmpdir(), 'nightshift-golden-'));
  const snapshot = join(directory, 'dataset.json');
  try {
    writeFileSync(snapshot, JSON.stringify(source), { mode: 0o600 });
    readGoldenDataset(snapshot, sourceDatasetName);
    process.env.NIGHTSHIFT_GOLDEN_SNAPSHOT = snapshot;
    return () => rmSync(directory, { recursive: true, force: true });
  } catch (error) {
    rmSync(directory, { recursive: true, force: true });
    throw error;
  }
}

export = setupGoldenDataset;
