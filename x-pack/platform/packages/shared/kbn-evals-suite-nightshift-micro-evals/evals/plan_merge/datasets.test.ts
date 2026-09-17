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

it('derives every active mutation example without requiring a split', () => {
  const directory = mkdtempSync(join(tmpdir(), 'micro-merge-test-'));
  const path = join(directory, 'dataset.json');
  const example = {
    id: 'synthetic-kbn',
    input: {
      initial_tree_mermaid: 'flowchart TD',
      causal_summary: 'Synthetic correction',
      question: 'unused',
      extra: true,
    },
    output: { mutation_spec: { correct_terminal: 'X1', extra: true }, extra: 42 },
    metadata: { langsmith_example_id: 'synthetic-ls', extra: 'retained' },
  };
  writeFileSync(
    path,
    JSON.stringify({
      name: 'deductive/context_graph_mutation',
      examples: [example, { ...example, metadata: { ...example.metadata, status: 'archived' } }],
    })
  );
  try {
    expect(readDataset(path)).toMatchObject({
      name: 'nightshift/micro/context_graph_mutation',
      examples: [
        {
          input: example.input,
          output: example.output,
          metadata: { ...example.metadata, source_kbn_example_id: 'synthetic-kbn' },
        },
      ],
    });
    expect(readDataset(path).examples[0]).not.toHaveProperty('id');
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
