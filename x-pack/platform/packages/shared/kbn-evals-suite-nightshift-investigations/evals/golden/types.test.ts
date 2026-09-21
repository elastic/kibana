/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { z } from '@kbn/zod/v4';
import { MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';
import { goldenExampleSchema } from './types';
import { GOLDEN_ALERT_EVAL_CONSTRAINTS } from './prompts';

describe('golden example schema', () => {
  const example = {
    input: { question: 'x'.repeat(MAX_TEXT_LENGTH - GOLDEN_ALERT_EVAL_CONSTRAINTS.length) },
    output: { reference_answer: 'Synthetic cause' },
    metadata: { langsmith_example_id: 'id', max_latency_seconds: 300, dataset_split: [] },
  };

  it('keeps the procurement schema identical to runtime validation', () => {
    expect(JSON.parse(readFileSync(join(__dirname, 'example.schema.json'), 'utf8'))).toEqual(
      z.toJSONSchema(goldenExampleSchema)
    );
  });

  it('accepts only questions that fit the product message limit with the constraints suffix', () => {
    expect(goldenExampleSchema.safeParse(example).success).toBe(true);
    expect(
      goldenExampleSchema.safeParse({
        ...example,
        input: { question: example.input.question + 'x' },
      }).success
    ).toBe(false);
  });

  it.each([300, '300'])(
    'validates an upstream example with budget %p, keeping source fields and dropping its storage id',
    (budget) => {
      const upstream = {
        id: 'owned-kbn-id',
        input: { question: 'Investigate synthetic service', extra_input: 42 },
        output: { reference_answer: 'Synthetic cause', extra_output: true },
        metadata: {
          langsmith_example_id: 'source-langsmith-id',
          source_kbn_example_id: 'source-kbn-id',
          case_id: 'synthetic-case',
          max_latency_seconds: budget,
          dataset_split: ['suite/investigate-lite', 'cluster/synthetic'],
          extra_metadata: 'retained',
        },
      };
      const { id, ...fields } = upstream;
      expect(goldenExampleSchema.parse(upstream)).toEqual(fields);
    }
  );
});
