/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { readDataset } from './datasets';
import { z } from '@kbn/zod/v4';
import { exampleSchema } from './types';

it('derives an owned monitor dataset and preserves source provenance and extra fields', () => {
  const directory = mkdtempSync(join(tmpdir(), 'micro-dataset-test-'));
  const file = join(directory, 'snapshot.json');
  const example = {
    id: 'source-id',
    input: {
      user_message: 'Synthetic alert 123',
      existing_monitors: [['123', 'Synthetic alert']],
      extra: true,
    },
    output: { expected_monitor_id: '123', extra: 42 },
    metadata: {
      dataset_split: ['suite/baseline'],
      langsmith_example_id: 'synthetic-ls-id',
      extra: 'retained',
    },
  };
  writeFileSync(
    file,
    JSON.stringify({
      name: 'deductive/monitor_id_extraction',
      examples: [
        example,
        { ...example, id: 'excluded', metadata: { ...example.metadata, dataset_split: [] } },
        { ...example, id: 'archived', metadata: { ...example.metadata, status: 'archived' } },
      ],
    })
  );
  try {
    expect(readDataset(file)).toMatchObject({
      name: 'nightshift/micro/monitor_id_extraction',
      tags: ['nightshift', 'micro-eval', 'MonitorIdExtraction'],
      examples: [
        {
          input: example.input,
          output: example.output,
          metadata: { ...example.metadata, source_kbn_example_id: 'source-id' },
        },
      ],
    });
    expect(readDataset(file).examples[0]).not.toHaveProperty('id');
  } finally {
    rmSync(directory, { recursive: true });
  }
});

it('keeps the committed schema and synthetic example valid against the runtime contract', () => {
  expect(JSON.parse(readFileSync(join(__dirname, 'example.schema.json'), 'utf8'))).toEqual(
    z.toJSONSchema(exampleSchema)
  );
  expect(
    exampleSchema.safeParse(JSON.parse(readFileSync(join(__dirname, 'example.json'), 'utf8')))
      .success
  ).toBe(true);
});
