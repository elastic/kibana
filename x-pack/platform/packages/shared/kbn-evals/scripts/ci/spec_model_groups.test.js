/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Validates the `specModelGroups` in the real evals.suites.json (the same file get_suite_info.js
// reads at runtime), so a hand-edit that names a non-existent spec, an ambiguous spec id, or a
// model outside the suite's provisioned weekly list fails at PR time rather than mid-fanout.

const { readFileSync } = require('fs');
const { fromRoot } = require('@kbn/repo-info');
const { pathToSpecId } = require('./spec_id');

const suites = JSON.parse(
  readFileSync(fromRoot('.buildkite/pipelines/evals/evals.suites.json'), 'utf8')
).suites;

const suitesWithSpecModelGroups = suites.filter(
  (suite) => suite.specModelGroups && Object.keys(suite.specModelGroups).length > 0
);

const specIdsForSuite = (suite) =>
  (suite.shards ?? []).flatMap((shard) => (shard.specFiles ?? []).map(pathToSpecId));

describe('evals.suites.json specModelGroups', () => {
  it('has at least one suite exercising specModelGroups (significant-events)', () => {
    expect(suitesWithSpecModelGroups.map((suite) => suite.id)).toContain('significant-events');
  });

  it('derives a unique spec id from every shard spec file', () => {
    const problems = [];
    for (const suite of suitesWithSpecModelGroups) {
      const seen = new Set();
      for (const specId of specIdsForSuite(suite)) {
        if (seen.has(specId)) {
          problems.push(`${suite.id}: two spec files derive the same id "${specId}"`);
        }
        seen.add(specId);
      }
    }
    expect(problems).toEqual([]);
  });

  it('keys every specModelGroups entry to a spec that a shard actually runs', () => {
    const problems = suitesWithSpecModelGroups.flatMap((suite) => {
      const specIds = new Set(specIdsForSuite(suite));
      return Object.keys(suite.specModelGroups)
        .filter((specId) => !specIds.has(specId))
        .map((specId) => `${suite.id}: specModelGroups key "${specId}" matches no shard spec file`);
    });
    expect(problems).toEqual([]);
  });

  it('gives every spec a non-empty list of string model groups', () => {
    const problems = suitesWithSpecModelGroups.flatMap((suite) =>
      Object.entries(suite.specModelGroups)
        .filter(
          ([, groups]) =>
            !Array.isArray(groups) ||
            groups.length === 0 ||
            groups.some((g) => typeof g !== 'string')
        )
        .map(([specId]) => `${suite.id}: specModelGroups["${specId}"] must be a non-empty string[]`)
    );
    expect(problems).toEqual([]);
  });

  it('keeps every per-spec model within the suite weeklyEisModelGroups (the provisioned universe)', () => {
    const problems = suitesWithSpecModelGroups.flatMap((suite) => {
      const weekly = new Set(suite.weeklyEisModelGroups ?? []);
      return Object.entries(suite.specModelGroups).flatMap(([specId, groups]) =>
        (groups ?? [])
          .filter((model) => !weekly.has(model))
          .map(
            (model) =>
              `${suite.id}: specModelGroups["${specId}"] model "${model}" is not in weeklyEisModelGroups`
          )
      );
    });
    expect(problems).toEqual([]);
  });
});
