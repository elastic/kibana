/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Validates the `specs` (and `shards` spec files) in the real evals.suites.json, so a hand-edit that
// points at a missing spec file, lists a spec twice, or names a model outside the suite's weekly list
// fails at PR time rather than mid-fanout.

const { readFileSync, existsSync } = require('fs');
const Path = require('path');
const { fromRoot } = require('@kbn/repo-info');

const suites = JSON.parse(
  readFileSync(fromRoot('.buildkite/pipelines/evals/evals.suites.json'), 'utf8')
).suites;

const suiteRoot = (suite) => fromRoot(Path.dirname(suite.configPath));
const specExists = (suite, specFile) => existsSync(Path.join(suiteRoot(suite), specFile));

const suitesWithSpecs = suites.filter((suite) => (suite.specs?.length ?? 0) > 0);
const shardedSuites = suites.filter((suite) => (suite.shards?.length ?? 0) > 0);

describe('evals.suites.json specs', () => {
  it('has at least one suite exercising specs (significant-events)', () => {
    expect(suitesWithSpecs.map((suite) => suite.id)).toContain('significant-events');
  });

  it('points every specs file at a spec that exists in the suite directory', () => {
    const problems = suitesWithSpecs.flatMap((suite) =>
      (suite.specs ?? [])
        .flatMap((spec) => spec.files ?? [])
        .filter((specFile) => !specExists(suite, specFile))
        .map((specFile) => `${suite.id}: specs file "${specFile}" does not exist`)
    );
    expect(problems).toEqual([]);
  });

  it('lists every spec file at most once across a suite', () => {
    const problems = [];
    for (const suite of suitesWithSpecs) {
      const seen = new Set();
      for (const specFile of (suite.specs ?? []).flatMap((spec) => spec.files ?? [])) {
        if (seen.has(specFile)) {
          problems.push(
            `${suite.id}: spec file "${specFile}" is listed in more than one specs entry`
          );
        }
        seen.add(specFile);
      }
    }
    expect(problems).toEqual([]);
  });

  it('gives every specs entry a non-empty list of files', () => {
    const problems = suitesWithSpecs.flatMap((suite) =>
      (suite.specs ?? [])
        .filter((spec) => !Array.isArray(spec.files) || spec.files.length === 0)
        .map(() => `${suite.id}: a specs entry has no files`)
    );
    expect(problems).toEqual([]);
  });

  it('gives a specs entry either no models or a non-empty list of string model groups', () => {
    const problems = suitesWithSpecs.flatMap((suite) =>
      (suite.specs ?? [])
        .filter(
          (spec) =>
            spec.models !== undefined &&
            (!Array.isArray(spec.models) ||
              spec.models.length === 0 ||
              spec.models.some((model) => typeof model !== 'string'))
        )
        .map(() => `${suite.id}: a specs entry's models must be a non-empty string[] when set`)
    );
    expect(problems).toEqual([]);
  });

  it('keeps every per-spec model within the suite weeklyEisModelGroups (the provisioned universe)', () => {
    const problems = suitesWithSpecs.flatMap((suite) => {
      const weekly = new Set(suite.weeklyEisModelGroups ?? []);
      return (suite.specs ?? []).flatMap((spec) =>
        (spec.models ?? [])
          .filter((model) => !weekly.has(model))
          .map((model) => `${suite.id}: specs model "${model}" is not in weeklyEisModelGroups`)
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
});
