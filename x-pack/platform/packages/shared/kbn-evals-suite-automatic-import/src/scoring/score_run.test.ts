/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AutomaticImportExampleExpected, AutomaticImportRunOutput } from '../types';
import type { EcsFields } from './ecs_fields';
import { extraFieldKey, f1, findExtraFields, precision, recall, scoreRun } from './score_run';

const ECS_FIELDS: EcsFields = new Map(
  [
    '@timestamp',
    'client.ip',
    'source.ip',
    'destination.port',
    'event.action',
    'event.dataset',
    'host.hostname',
    'observer.hostname',
    'user.name',
    'source.geo.country_name',
  ].map((name) => [name, {}])
);

const NO_CORRECT_EXTRAS: ReadonlySet<string> = new Set();

const expectedFor = (
  docs: Array<Record<string, unknown>>,
  unscoredFields?: string[]
): AutomaticImportExampleExpected => ({
  samples: docs.map((expected) => ({ expected, unscoredFields })),
});

const completed = (docs: Array<Record<string, unknown>>): AutomaticImportRunOutput => ({
  runId: 'vendor_a_1',
  status: 'completed',
  lines: docs.map((doc) => ({ doc })),
});

describe('scoreRun', () => {
  it('scores matching ECS values and ignores unscored and non-ECS fields', () => {
    const expected = expectedFor([
      {
        source: { ip: '10.0.0.1', geo: { country_name: 'Sweden' } },
        destination: { port: 443 },
        event: { action: 'allow', dataset: 'vendor.log' },
        vendor: { rule: 'r1' },
      },
    ]);
    const output = completed([
      {
        source: { ip: '10.0.0.1' },
        destination: { port: '443' },
        event: { action: 'accept' },
        vendor_a: { rule: 'r1' },
      },
    ]);

    const score = scoreRun(output, expected, ECS_FIELDS, NO_CORRECT_EXTRAS);

    expect(score).toMatchObject({
      expectedFields: 3,
      matchedExpectedFields: 2,
      generatedFields: 3,
      matchedGeneratedFields: 2,
    });
    expect(recall(score)).toBeCloseTo(2 / 3);
    expect(precision(score)).toBeCloseTo(2 / 3);
    expect(f1(score)).toBeCloseTo(2 / 3);
  });

  it('counts fields in equivalent groups as the same field', () => {
    const score = scoreRun(
      completed([{ host: { hostname: 'fw01' }, source: { ip: '10.0.0.1' } }]),
      expectedFor([{ observer: { hostname: 'fw01' }, client: { ip: '10.0.0.1' } }]),
      ECS_FIELDS,
      NO_CORRECT_EXTRAS
    );

    expect(recall(score)).toBe(1);
    expect(precision(score)).toBe(1);
    expect(score.misplaced).toEqual([]);
  });

  it('lists values found under a different field without counting them', () => {
    const score = scoreRun(
      completed([{ event: { action: 'jdoe' } }, { event: { action: 'asmith' } }]),
      expectedFor([{ user: { name: 'jdoe' } }, { user: { name: 'asmith' } }]),
      ECS_FIELDS,
      NO_CORRECT_EXTRAS
    );

    expect(recall(score)).toBe(0);
    expect(score.misplaced).toEqual([
      { expectedField: 'user.name', foundField: 'event.action', count: 2 },
    ]);
  });

  it("skips the sample's unscored fields", () => {
    const score = scoreRun(
      completed([{ '@timestamp': '2026-01-01T00:00:00Z' }]),
      expectedFor([{ '@timestamp': '2025-06-01T00:00:00Z' }], ['@timestamp']),
      ECS_FIELDS,
      NO_CORRECT_EXTRAS
    );

    expect(score.expectedFields).toBe(0);
    expect(score.generatedFields).toBe(0);
  });

  it('scores lines that failed to parse as all expected fields missed', () => {
    const output: AutomaticImportRunOutput = {
      runId: 'vendor_a_1',
      status: 'completed',
      lines: [{ doc: { user: { name: 'jdoe' } } }, { error: 'grok failed' }],
    };
    const score = scoreRun(
      output,
      expectedFor([{ user: { name: 'jdoe' } }, { user: { name: 'asmith' } }]),
      ECS_FIELDS,
      NO_CORRECT_EXTRAS
    );

    expect(score.parsedLines).toBe(1);
    expect(recall(score)).toBe(0.5);
    expect(precision(score)).toBe(1);
  });

  it('scores a failed analysis as zero', () => {
    const output: AutomaticImportRunOutput = {
      runId: 'vendor_a_1',
      status: 'failed',
      error: 'Analysis failed',
      lines: [],
    };
    const score = scoreRun(
      output,
      expectedFor([{ user: { name: 'jdoe' } }]),
      ECS_FIELDS,
      NO_CORRECT_EXTRAS
    );

    expect(score.parsedLines).toBe(0);
    expect(f1(score)).toBe(0);
  });

  it('counts a field the reference does not set as correct only when judged correct', () => {
    const output = completed([{ user: { name: 'jdoe' }, source: { ip: '10.0.0.1' } }]);
    const expected = expectedFor([{ user: { name: 'jdoe' } }]);

    const judgedCorrect = scoreRun(
      output,
      expected,
      ECS_FIELDS,
      new Set([extraFieldKey(0, 'source.ip')])
    );
    const notJudgedCorrect = scoreRun(output, expected, ECS_FIELDS, NO_CORRECT_EXTRAS);

    expect(judgedCorrect).toMatchObject({ extraFields: 1, correctExtraFields: 1 });
    expect(precision(judgedCorrect)).toBe(1);
    expect(notJudgedCorrect).toMatchObject({ extraFields: 1, correctExtraFields: 0 });
    expect(precision(notJudgedCorrect)).toBe(0.5);
  });

  it('counts a field the reference sets to a different value as wrong, not extra', () => {
    const score = scoreRun(
      completed([{ event: { action: 'accept' } }]),
      expectedFor([{ event: { action: 'allow' } }]),
      ECS_FIELDS,
      new Set([extraFieldKey(0, 'event.action')])
    );

    expect(score.extraFields).toBe(0);
    expect(precision(score)).toBe(0);
  });
});

describe('findExtraFields', () => {
  it('returns generated fields the reference has no equivalent field for', () => {
    const extras = findExtraFields(
      completed([{ host: { hostname: 'fw01' }, user: { name: 'jdoe' } }]),
      expectedFor([{ observer: { hostname: 'fw01' } }]),
      ECS_FIELDS
    );

    expect(extras).toEqual([
      {
        line: 0,
        field: 'user.name',
        value: 'jdoe',
        doc: { 'host.hostname': 'fw01', 'user.name': 'jdoe' },
      },
    ]);
  });
});
