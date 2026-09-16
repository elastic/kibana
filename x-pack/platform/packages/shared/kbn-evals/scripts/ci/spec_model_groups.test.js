/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Validates the `specModelGroups` (and `shards` spec files) in the real evals.suites.json, so a
// hand-edit that points at a missing spec file, lists a spec twice, or names a model outside the
// suite's weekly list fails at PR time rather than mid-fanout.

const { readFileSync, existsSync, readdirSync } = require('fs');
const Path = require('path');
const { fromRoot } = require('@kbn/repo-info');

const suites = JSON.parse(
  readFileSync(fromRoot('.buildkite/pipelines/evals/evals.suites.json'), 'utf8')
).suites;

const suiteRoot = (suite) => fromRoot(Path.dirname(suite.configPath));
const specExists = (suite, specFile) => existsSync(Path.join(suiteRoot(suite), specFile));

// Spec files (posix paths relative to the suite root) physically present under a suite directory.
const specFilesOnDisk = (root) => {
  const found = [];
  const walk = (dir, rel) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules') continue;
      const abs = Path.join(dir, entry.name);
      const relPath = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(abs, relPath);
      } else if (entry.name.endsWith('.spec.ts')) {
        found.push(relPath);
      }
    }
  };
  walk(root, '');
  return found;
};

// A suite "owns" its directory when no other suite's config lives in the same or a nested/parent
// folder. Some packages host several suites (e.g. agent-builder), where a directory scan would pick
// up specs belonging to sibling suites, so the completeness check only runs for owned directories.
const ownsSuiteDirectory = (suite) => {
  const root = suiteRoot(suite);
  return !suites.some((other) => {
    if (other === suite) return false;
    const otherRoot = suiteRoot(other);
    return (
      otherRoot === root ||
      otherRoot.startsWith(`${root}${Path.sep}`) ||
      root.startsWith(`${otherRoot}${Path.sep}`)
    );
  });
};

const suitesWithSpecModelGroups = suites.filter(
  (suite) => (suite.specModelGroups?.length ?? 0) > 0
);
const shardedSuites = suites.filter((suite) => (suite.shards?.length ?? 0) > 0);

describe('evals.suites.json specModelGroups', () => {
  it('has at least one suite exercising specModelGroups (significant-events)', () => {
    expect(suitesWithSpecModelGroups.map((suite) => suite.id)).toContain('significant-events');
  });

  it('points every specModelGroups file at a spec that exists in the suite directory', () => {
    const problems = suitesWithSpecModelGroups.flatMap((suite) =>
      (suite.specModelGroups ?? [])
        .flatMap((spec) => spec.files ?? [])
        .filter((specFile) => !specExists(suite, specFile))
        .map((specFile) => `${suite.id}: specModelGroups file "${specFile}" does not exist`)
    );
    expect(problems).toEqual([]);
  });

  it('lists every spec file at most once across a suite', () => {
    const problems = [];
    for (const suite of suitesWithSpecModelGroups) {
      const seen = new Set();
      for (const specFile of (suite.specModelGroups ?? []).flatMap((spec) => spec.files ?? [])) {
        if (seen.has(specFile)) {
          problems.push(
            `${suite.id}: spec file "${specFile}" is listed in more than one specModelGroups entry`
          );
        }
        seen.add(specFile);
      }
    }
    expect(problems).toEqual([]);
  });

  it('gives every specModelGroups entry a non-empty list of files', () => {
    const problems = suitesWithSpecModelGroups.flatMap((suite) =>
      (suite.specModelGroups ?? [])
        .filter((spec) => !Array.isArray(spec.files) || spec.files.length === 0)
        .map(() => `${suite.id}: a specModelGroups entry has no files`)
    );
    expect(problems).toEqual([]);
  });

  it('gives a specModelGroups entry either no models or a non-empty list of string model groups', () => {
    const problems = suitesWithSpecModelGroups.flatMap((suite) =>
      (suite.specModelGroups ?? [])
        .filter(
          (spec) =>
            spec.models !== undefined &&
            (!Array.isArray(spec.models) ||
              spec.models.length === 0 ||
              spec.models.some((model) => typeof model !== 'string'))
        )
        .map(
          () =>
            `${suite.id}: a specModelGroups entry's models must be a non-empty string[] when set`
        )
    );
    expect(problems).toEqual([]);
  });

  it('keeps every per-spec model within the suite weeklyEisModelGroups (the provisioned universe)', () => {
    const problems = suitesWithSpecModelGroups.flatMap((suite) => {
      const weekly = new Set(suite.weeklyEisModelGroups ?? []);
      return (suite.specModelGroups ?? []).flatMap((spec) =>
        (spec.models ?? [])
          .filter((model) => !weekly.has(model))
          .map(
            (model) =>
              `${suite.id}: specModelGroups model "${model}" is not in weeklyEisModelGroups`
          )
      );
    });
    expect(problems).toEqual([]);
  });

  it('points every shard spec file at a spec that exists in the suite directory', () => {
    const problems = shardedSuites.flatMap((suite) =>
      (suite.shards ?? [])
        .flatMap((shard) => shard.specFiles ?? [])
        .filter((specFile) => !specExists(suite, specFile))
        .map((specFile) => `${suite.id}: shard spec file "${specFile}" does not exist`)
    );
    expect(problems).toEqual([]);
  });

  it('lists every spec on disk so a newly added one is not silently skipped in weekly runs', () => {
    // Per-spec suites run only the specs listed in evals.suites.json, so a new spec file that nobody
    // lists would silently never run. Guard directory-owning suites (see ownsSuiteDirectory) here.
    const problems = suitesWithSpecModelGroups.filter(ownsSuiteDirectory).flatMap((suite) => {
      const listed = new Set([
        ...(suite.specModelGroups ?? []).flatMap((spec) => spec.files ?? []),
        ...(suite.shards ?? []).flatMap((shard) => shard.specFiles ?? []),
      ]);
      return specFilesOnDisk(suiteRoot(suite))
        .filter((specFile) => !listed.has(specFile))
        .map(
          (specFile) =>
            `${suite.id}: spec "${specFile}" exists on disk but is not listed in specModelGroups/shards`
        );
    });
    expect(problems).toEqual([]);
  });
});
