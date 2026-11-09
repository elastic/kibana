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
export type Lane = 'incumbent' | 'candidate';

/**
 * Per-lane config and asset directories.
 *
 * Incumbent and candidate are measured in the same round, so they cannot share one config file:
 * each lane has its own Kibana process, started with `ESQL_HARNESS_CONFIG` and
 * `ESQL_HARNESS_ASSETS` pointing at that lane's directory.
 */
export const lanePaths = (lane: Lane) => {
  const root = Path.join(harnessPaths().root, lane);
  const assetsDir = Path.join(root, 'assets');
  Fs.mkdirSync(assetsDir, { recursive: true });
  return { root, configPath: Path.join(root, 'config.json'), assetsDir };
};

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

/** Install a config where the lane's Kibana will pick it up on its next tool call. */
export const writeLaneConfig = (lane: Lane, config: Record<string, unknown>): string => {
  Fs.writeFileSync(lanePaths(lane).configPath, `${JSON.stringify(config, null, 2)}\n`);
  return configHash(config);
};

/** Replace a lane's asset overrides with exactly the given files (absent files fall back to bundled). */
export const writeLaneAssets = (lane: Lane, assets: Record<string, string>): string => {
  const { assetsDir } = lanePaths(lane);
  Fs.rmSync(assetsDir, { recursive: true, force: true });
  Fs.mkdirSync(assetsDir, { recursive: true });
  for (const [assetPath, content] of Object.entries(assets)) {
    const absolute = Path.join(assetsDir, assetPath);
    Fs.mkdirSync(Path.dirname(absolute), { recursive: true });
    Fs.writeFileSync(absolute, content);
  }
  return configHash(assets);
};

/** Install a candidate config as the one the running Kibana will pick up on its next tool call. */
export const writeActiveConfig = (config: Record<string, unknown>): string => {
  const { configPath } = harnessPaths();
  Fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  return configHash(config);
};
