/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { getGoldenSourceDatasetName, readGoldenDataset } from './datasets';
import { z } from '@kbn/zod/v4';
import { MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';
import { goldenExampleSchema } from './types';
import { GOLDEN_ALERT_EVAL_CONSTRAINTS } from './prompts';

describe('golden dataset derivation', () => {
  it('keeps the procurement schema identical to runtime validation', () => {
    expect(JSON.parse(readFileSync(join(__dirname, 'example.schema.json'), 'utf8'))).toEqual(
      z.toJSONSchema(goldenExampleSchema)
    );
  });

  it('accepts only questions that fit the product message limit with the constraints suffix', () => {
    const example = {
      input: { question: 'x'.repeat(MAX_TEXT_LENGTH - GOLDEN_ALERT_EVAL_CONSTRAINTS.length) },
      output: { reference_answer: 'Synthetic cause' },
      metadata: { langsmith_example_id: 'id', max_latency_seconds: 300, dataset_split: [] },
    };
    expect(goldenExampleSchema.safeParse(example).success).toBe(true);
    expect(
      goldenExampleSchema.safeParse({
        ...example,
        input: { question: example.input.question + 'x' },
      }).success
    ).toBe(false);
  });

  it.each([300, '300'])(
    'preserves source fields, including budget %p, while intersecting splits and excluding archived examples',
    (budget) => {
      const directory = mkdtempSync(join(tmpdir(), 'nightshift-dataset-test-'));
      const file = join(directory, 'snapshot.json');
      const source = {
        id: 'source-kbn-id',
        input: { question: 'Investigate synthetic service', extra_input: 42 },
        output: { reference_answer: 'Synthetic cause', extra_output: true },
        metadata: {
          langsmith_example_id: 'source-langsmith-id',
          case_id: 'synthetic-case',
          max_latency_seconds: budget,
          dataset_split: ['suite/investigate-lite', 'cluster/synthetic'],
          extra_metadata: 'retained',
        },
      };
      writeFileSync(
        file,
        JSON.stringify({
          name: 'synthetic/golden',
          examples: [
            source,
            {
              ...source,
              id: 'wrong-split',
              metadata: { ...source.metadata, dataset_split: ['suite/investigate-lite'] },
            },
            { ...source, id: 'archived', metadata: { ...source.metadata, status: 'archived' } },
          ],
        })
      );
      try {
        const dataset = readGoldenDataset(file, 'synthetic/golden', [
          'suite/investigate-lite',
          'cluster/synthetic',
        ]);
        expect(() => readGoldenDataset(file, 'synthetic/other')).toThrow(
          'Golden snapshot does not match the configured source dataset.'
        );
        expect(dataset.name).toBe('nightshift/investigate-lite');
        expect(dataset.examples).toEqual([
          {
            input: source.input,
            output: source.output,
            metadata: { ...source.metadata, source_kbn_example_id: 'source-kbn-id' },
          },
        ]);
      } finally {
        rmSync(directory, { recursive: true });
      }
    }
  );
});

describe('golden source configuration', () => {
  const originalName = process.env.NIGHTSHIFT_GOLDEN_SOURCE_DATASET;

  afterEach(() => {
    if (originalName === undefined) {
      delete process.env.NIGHTSHIFT_GOLDEN_SOURCE_DATASET;
    } else {
      process.env.NIGHTSHIFT_GOLDEN_SOURCE_DATASET = originalName;
    }
  });

  it.each([undefined, '', '   ', 'x'.repeat(501)])('rejects an invalid source name', (name) => {
    if (name === undefined) {
      delete process.env.NIGHTSHIFT_GOLDEN_SOURCE_DATASET;
    } else {
      process.env.NIGHTSHIFT_GOLDEN_SOURCE_DATASET = name;
    }
    expect(getGoldenSourceDatasetName).toThrow('NIGHTSHIFT_GOLDEN_SOURCE_DATASET');
  });

  it('uses the privately configured source name verbatim', () => {
    process.env.NIGHTSHIFT_GOLDEN_SOURCE_DATASET = 'synthetic/golden';
    expect(getGoldenSourceDatasetName()).toBe('synthetic/golden');
  });
});
