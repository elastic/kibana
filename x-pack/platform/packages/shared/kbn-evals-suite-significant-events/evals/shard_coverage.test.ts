/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';

/**
 * CI splits this suite across Buildkite steps by grepping describe titles, so the shard greps in
 * `.buildkite/pipelines/evals/evals.suites.json` and the titles in the specs are one contract.
 * Renaming a describe without updating the greps drops its tests into the catch-all shard, which
 * still passes but can push that step past its timeout. Renaming one means updating the other.
 */

interface EvalsSuiteShard {
  id: string;
  grep?: string;
  grepInvert?: string;
}

const SUITE_ID = 'significant-events';
const SUITES_CONFIG = Path.resolve(REPO_ROOT, '.buildkite/pipelines/evals/evals.suites.json');

// Playwright greps the full title, and a top-level describe title is always a prefix of it, so
// membership is decidable from these alone. Nested describes are indented; `^` keeps them out.
const TOP_LEVEL_DESCRIBE = /^evaluate\.describe\(\s*(['"`])(.+?)\1/gm;

const collectSpecFiles = (dir: string): string[] =>
  Fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = Path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return collectSpecFiles(entryPath);
    }
    return entry.name.endsWith('.spec.ts') ? [entryPath] : [];
  });

const describeTitles = collectSpecFiles(__dirname).flatMap((specFile) =>
  Array.from(Fs.readFileSync(specFile, 'utf-8').matchAll(TOP_LEVEL_DESCRIBE), ([, , title]) => ({
    title,
    specFile: Path.relative(REPO_ROOT, specFile),
  }))
);

const shards: EvalsSuiteShard[] =
  (
    JSON.parse(Fs.readFileSync(SUITES_CONFIG, 'utf-8')) as {
      suites: Array<{ id: string; shards?: EvalsSuiteShard[] }>;
    }
  ).suites.find((suite) => suite.id === SUITE_ID)?.shards ?? [];

const shardsRunning = (title: string): string[] =>
  shards
    .filter(({ grep, grepInvert }) => {
      if (grep && !RegExp(grep).test(title)) {
        return false;
      }
      return !(grepInvert && RegExp(grepInvert).test(title));
    })
    .map(({ id }) => id);

describe('significant-events shard coverage', () => {
  it('has both sides of the contract to compare', () => {
    // Both tests below pass vacuously if either side comes back empty.
    expect(shards.length).toBeGreaterThan(0);
    expect(describeTitles.length).toBeGreaterThan(0);
  });

  it('runs every top-level describe in exactly one shard', () => {
    const problems = describeTitles
      .map((entry) => ({ ...entry, shardIds: shardsRunning(entry.title) }))
      .filter(({ shardIds }) => shardIds.length !== 1)
      .map(
        ({ title, specFile, shardIds }) =>
          `"${title}" (${specFile}) runs in ${shardIds.length} shards: [${shardIds.join(', ')}]`
      );

    expect(problems).toEqual([]);
  });

  it('leaves no shard without tests to run', () => {
    const problems = shards
      .filter(({ id }) => !describeTitles.some(({ title }) => shardsRunning(title).includes(id)))
      .map(({ id }) => `shard "${id}" matches no describe, so its grep is stale`);

    expect(problems).toEqual([]);
  });
});
