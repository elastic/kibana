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
 * Filesystem contract between the optimization loop and the Kibana process under test.
 *
 * Kibana is started with `ESQL_HARNESS_CONFIG=<root>/current.json` and
 * `ESQL_HARNESS_TRACE_FILE=<root>/trace.jsonl`. The loop owns both files; nothing in production
 * ever sets those variables.
 */
export const harnessPaths = () => {
  const root = process.env.ESQL_HARNESS_DIR ?? Path.join(Os.homedir(), '.esql-harness');
  Fs.mkdirSync(root, { recursive: true });
  return {
    root,
    configPath: process.env.ESQL_HARNESS_CONFIG ?? Path.join(root, 'current.json'),
    tracePath: process.env.ESQL_HARNESS_TRACE_FILE ?? Path.join(root, 'trace.jsonl'),
    runsDir: Path.join(root, 'runs'),
    lineageDir: Path.join(root, 'lineage'),
  };
};

export const activeConfigPath = (): string => harnessPaths().configPath;

export const configHash = (config: Record<string, unknown>): string =>
  Crypto.createHash('sha256').update(JSON.stringify(config)).digest('hex').slice(0, 10);

/** Install a candidate config as the one the running Kibana will pick up on its next tool call. */
export const writeActiveConfig = (config: Record<string, unknown>): string => {
  const { configPath } = harnessPaths();
  Fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  return configHash(config);
};
