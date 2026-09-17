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
import {
  SOURCE_DATASET as monitorSource,
  readDataset as readMonitor,
} from '../evals/monitor_id_extraction/datasets';
import {
  SOURCE_DATASET as extractionSource,
  readDataset as readExtraction,
} from '../evals/plan_extraction/datasets';
import {
  SOURCE_DATASET as mergeSource,
  readDataset as readMerge,
} from '../evals/plan_merge/datasets';

/** Snapshots all three read-only source datasets before Playwright collects the spec. */
const setupMicroDatasets = async (): Promise<() => void> => {
  const url = process.env.EVAL_KBN_URL;
  if (!url)
    throw new Error('Micro evals require a results-cluster profile with evaluationsKbn.url.');
  const log = new ToolingLog({ level: 'info', writeTo: process.stdout });
  const client = new EvalsClient(
    getEvaluationsKbnClient({ kbnClient: new KbnClient({ url, log }), log }),
    log
  );
  const directory = mkdtempSync(join(tmpdir(), 'nightshift-micro-'));
  try {
    for (const [task, sourceName, readDataset] of [
      ['monitor_id_extraction', monitorSource, readMonitor],
      ['plan_extraction', extractionSource, readExtraction],
      ['plan_merge', mergeSource, readMerge],
    ] as const) {
      const source = await client.getDatasetByName(sourceName);
      if (!source)
        throw new Error(`Approved dataset ${sourceName} was not found on the selected cluster.`);
      const snapshot = join(directory, `${task}.json`);
      writeFileSync(snapshot, JSON.stringify(source), { mode: 0o600 });
      readDataset(snapshot);
    }
    process.env.NIGHTSHIFT_MICRO_SNAPSHOT_DIR = directory;
    return () => rmSync(directory, { recursive: true, force: true });
  } catch (error) {
    rmSync(directory, { recursive: true, force: true });
    throw error;
  }
};

export = setupMicroDatasets;
