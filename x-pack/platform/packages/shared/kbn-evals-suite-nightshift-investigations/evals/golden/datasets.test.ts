/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { readGoldenDataset } from './datasets';

describe('golden dataset derivation', () => {
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
          name: 'deductive/doordashv2',
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
        const dataset = readGoldenDataset(file, ['suite/investigate-lite', 'cluster/synthetic']);
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
