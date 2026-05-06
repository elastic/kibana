/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFlagError } from '@kbn/dev-cli-errors';

export interface ParsedShard {
  readonly index: number;
  readonly total: number;
}

const SHARD_FORMAT = /^(\d+)\/(\d+)$/;

export const parseShard = (raw: string): ParsedShard => {
  const match = SHARD_FORMAT.exec(raw.trim());
  if (!match) {
    throw createFlagError(`--shard must look like "i/N" (got "${raw}").`);
  }
  const index = Number(match[1]);
  const total = Number(match[2]);
  if (total < 1) {
    throw createFlagError(`--shard total N must be >= 1 (got "${raw}").`);
  }
  if (index < 1 || index > total) {
    throw createFlagError(`--shard index i must satisfy 1 <= i <= N (got "${raw}").`);
  }
  return { index, total };
};

export interface BuildPlaywrightArgsOptions {
  readonly configPath: string;
  readonly project?: string;
  readonly grep?: string;
  readonly shard?: ParsedShard;
  readonly positionals?: readonly string[];
}

export const buildPlaywrightArgs = ({
  configPath,
  project,
  grep,
  shard,
  positionals,
}: BuildPlaywrightArgsOptions): string[] => {
  const args = ['scripts/playwright', 'test', '--config', configPath];
  if (project) {
    args.push('--project', project);
  }
  if (grep) {
    args.push('--grep', grep);
  }
  if (shard) {
    args.push(`--shard=${shard.index}/${shard.total}`);
  }
  if (positionals && positionals.length > 0) {
    args.push(...positionals);
  }
  return args;
};
