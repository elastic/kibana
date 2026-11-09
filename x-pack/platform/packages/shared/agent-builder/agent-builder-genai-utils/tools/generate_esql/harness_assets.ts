/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';

/**
 * Text assets of the harness that the offline optimization loop may replace wholesale.
 *
 * The typed config covers *policy*; this covers *content* — the documentation corpus injected
 * into every prompt and the instruction block. Those are the largest things the model reads, and
 * they are plain text, so they can be swapped without executing anything the optimizer wrote.
 *
 * Overrides live in the directory named by `ESQL_HARNESS_ASSETS`, under the same relative paths
 * as the bundled assets. With the variable unset nothing on this path is touched and the bundled
 * content is used.
 */
export const HARNESS_ASSET_PATHS = [
  'documentation/syntax.md',
  'documentation/examples.md',
  'documentation/ts_queries.md',
  'documentation/promql_queries.md',
  'prompts/instructions.md',
] as const;

export type HarnessAssetPath = (typeof HARNESS_ASSET_PATHS)[number];

const ENV_VAR = 'ESQL_HARNESS_ASSETS';

const cache = new Map<string, { mtimeMs: number; content: string }>();

export const assetOverridesEnabled = (): boolean => Boolean(process.env[ENV_VAR]);

/**
 * Overridden content for an asset, or `undefined` when no override is configured.
 *
 * Re-reads on mtime change so a round can swap assets without restarting Kibana, and never
 * throws: a malformed override falls back to the bundled asset rather than breaking the tool.
 */
export const readAssetOverride = (assetPath: HarnessAssetPath): string | undefined => {
  const root = process.env[ENV_VAR];
  if (!root) {
    return undefined;
  }

  const absolute = Path.join(root, assetPath);
  try {
    const { mtimeMs } = Fs.statSync(absolute);
    const cached = cache.get(absolute);
    if (cached && cached.mtimeMs === mtimeMs) {
      return cached.content;
    }
    const content = Fs.readFileSync(absolute, 'utf8');
    cache.set(absolute, { mtimeMs, content });
    return content;
  } catch (e) {
    return undefined;
  }
};
