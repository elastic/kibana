/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Crypto from 'crypto';
import Fs from 'fs';
import Os from 'os';
import Path from 'path';

/**
 * Filesystem contract between the optimization loop and the Kibana processes under test.
 *
 * A harness variant *is* the state of a worktree — there is no config channel. The loop owns
 * only two things at runtime: where each lane writes its harness trace, and where run artifacts
 * and the ledger are stored.
 */
export type Lane = 'incumbent' | 'candidate';

export const harnessPaths = () => {
  const root = process.env.ESQL_HARNESS_DIR ?? Path.join(Os.homedir(), '.esql-harness');
  Fs.mkdirSync(root, { recursive: true });
  return {
    root,
    runsDir: Path.join(root, 'runs'),
    lineageDir: Path.join(root, 'lineage'),
  };
};

/** Per-lane trace file; each lane is a separate Kibana process writing its own trace. */
export const lanePaths = (lane: Lane) => {
  const root = Path.join(harnessPaths().root, lane);
  const traceDir = Path.join(root, 'traces');
  Fs.mkdirSync(traceDir, { recursive: true });
  return { root, tracePath: Path.join(root, 'trace.jsonl'), traceDir };
};

/** Identity of a variant: the hash of the diff that produced it. */
export const variantHash = (diff: string): string =>
  Crypto.createHash('sha256').update(diff).digest('hex').slice(0, 10);
