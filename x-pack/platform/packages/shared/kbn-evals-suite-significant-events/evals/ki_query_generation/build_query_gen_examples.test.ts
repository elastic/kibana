/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature } from '@kbn/significant-events-schema';
import type { KIQueryGenerationScenario } from '../../src/datasets';
import {
  assertRerunRequiresCanonicalKIs,
  buildQueryGenerationExamples,
  type CollectedQueryGenExample,
} from './build_query_gen_examples';

const cleanCriteria = [
  { id: 'clean-jdbc-error-query', text: 'Must generate a JDBC error query', score: 3 },
];
const rerunCriteria = [
  { id: 'unseeded-timeout-signal', text: 'Must generate a frontend timeout query', score: 3 },
  { id: 'semantic-avoidance', text: 'Must not repeat the seeded JDBC detection', score: 2 },
];

const scenario = (
  overrides: Partial<KIQueryGenerationScenario> = {}
): KIQueryGenerationScenario => ({
  input: {
    scenario_id: 'ledger-db-disconnect',
    stream_name: 'logs',
    stream_description: 'Bank of Anthos ledger-db disconnect',
  },
  output: {
    criteria: cleanCriteria,
    expected_categories: ['error'],
    expected_ground_truth: 'gt',
  },
  metadata: {
    difficulty: 'medium',
    failure_domain: 'ledger-db',
    failure_mode: 'database_disconnect',
  },
  ...overrides,
});

const rerunBlock = {
  existing_queries: [
    {
      id: 'seed-1',
      title: 'JDBC connection failure',
      type: 'match',
      description: 'Seeded JDBC detection',
      esql: 'FROM logs | WHERE message LIKE "%SQLState: 08001%"',
    },
  ],
  criteria: rerunCriteria,
};

const collected = (scn: KIQueryGenerationScenario): CollectedQueryGenExample => ({
  scenario: scn,
  kis: [],
  sampleLogs: [],
  sampleDocs: [],
});

describe('buildQueryGenerationExamples', () => {
  it('produces a single clean example for a scenario without rerun', () => {
    const examples = buildQueryGenerationExamples([collected(scenario())], 'logs*');

    expect(examples).toHaveLength(1);
    expect(examples[0].id).toBe('ledger-db-disconnect');
    expect(examples[0].metadata).toMatchObject({
      evaluation_arm: 'clean',
      test_index: 'logs*',
    });
    expect(examples[0].output).toMatchObject({ criteria: cleanCriteria });
    expect(examples[0].input).not.toHaveProperty('existing_queries');
  });

  it('splits a scenario with rerun into clean and rerun arms with unique ids', () => {
    const examples = buildQueryGenerationExamples(
      [collected(scenario({ rerun: rerunBlock }))],
      'logs*'
    );

    expect(examples).toHaveLength(2);
    expect(examples[0]).toMatchObject({
      id: 'ledger-db-disconnect',
      metadata: { evaluation_arm: 'clean' },
    });
    expect(examples[1]).toMatchObject({
      id: 'ledger-db-disconnect:rerun',
      metadata: { evaluation_arm: 'rerun' },
    });
  });

  it('only the rerun arm receives existing_queries and the rerun criteria', () => {
    const examples = buildQueryGenerationExamples(
      [collected(scenario({ rerun: rerunBlock }))],
      'logs*'
    );

    const [clean, rerun] = examples;
    expect(clean.input).not.toHaveProperty('existing_queries');
    expect(clean.output.criteria).toEqual(cleanCriteria);

    const rerunInput = rerun.input as { existing_queries?: unknown };
    expect(rerunInput.existing_queries).toEqual(rerunBlock.existing_queries);
    expect(rerun.output.criteria).toEqual(rerunCriteria);
    expect(rerun.output.criteria).not.toContain(cleanCriteria[0]);
  });

  it('never leaks clean or rerun criteria into the generation task input', () => {
    const examples = buildQueryGenerationExamples(
      [collected(scenario({ rerun: rerunBlock }))],
      'logs*'
    );

    const inputs = examples.map((example) => JSON.stringify(example.input));
    for (const text of ['Must generate a JDBC error query', 'frontend timeout', 'seeded JDBC']) {
      expect(inputs.join('')).not.toContain(text);
    }
  });

  it('shares the same replayed-document identity across both arms', () => {
    const examples = buildQueryGenerationExamples(
      [collected(scenario({ rerun: rerunBlock }))],
      'logs*'
    );

    expect(examples[0].input.scenario_id).toBe(examples[1].input.scenario_id);
    expect(examples[1].id).toBe(`${examples[0].id}:rerun`);
  });
});

describe('assertRerunRequiresCanonicalKIs', () => {
  const canonicalKi = { id: 'ki-1', type: 'entity' } as Feature;

  it('throws for a rerun scenario without canonical ground-truth KIs', () => {
    expect(() => assertRerunRequiresCanonicalKIs(scenario({ rerun: rerunBlock }), [])).toThrow(
      /ledger-db-disconnect.*canonical/
    );
  });

  it('does not throw when canonical KIs exist', () => {
    expect(() =>
      assertRerunRequiresCanonicalKIs(scenario({ rerun: rerunBlock }), [canonicalKi])
    ).not.toThrow();
  });

  it('does not throw for a clean scenario even with no canonical KIs', () => {
    expect(() => assertRerunRequiresCanonicalKIs(scenario(), [])).not.toThrow();
  });
});
