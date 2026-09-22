/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';
import { readRemoteDataset, remoteExampleSchema, remoteExamplesFileSchema } from './datasets';
import { ELASTIC_INVESTIGATION_EVAL_CONSTRAINTS } from './prompts';

const example = {
  input: { question: 'Investigate the synthetic checkout error spike' },
  output: { reference_answer: 'A synthetic pod was deleted and replaced.' },
  metadata: {
    case_id: 'synthetic-case',
    category: 'investigate',
    max_latency_seconds: 600,
    dataset_split: ['cluster/synthetic', 'suite/remote-smoke'],
  },
};

const withFile = (contents: unknown, run: (path: string) => void) => {
  const directory = mkdtempSync(join(tmpdir(), 'nightshift-remote-test-'));
  const path = join(directory, 'examples.json');
  writeFileSync(path, JSON.stringify(contents));
  try {
    run(path);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
};

describe('remote examples file', () => {
  it('reads an owned dataset with defaults applied', () => {
    withFile({ examples: [example] }, (path) => {
      const dataset = readRemoteDataset(path);
      expect(dataset.name).toBe('nightshift/remote-smoke');
      expect(dataset.tags).toEqual(['nightshift', 'capability-baseline']);
      expect(dataset.examples).toEqual([example]);
    });
  });

  it('keeps the operator-supplied dataset name, description and tags', () => {
    withFile(
      {
        dataset: 'nightshift/synthetic-baseline',
        description: 'Synthetic incidents',
        tags: ['synthetic', 'nightshift'],
        examples: [example],
      },
      (path) => {
        const dataset = readRemoteDataset(path);
        expect(dataset.name).toBe('nightshift/synthetic-baseline');
        expect(dataset.description).toBe('Synthetic incidents');
        expect(dataset.tags).toEqual(['nightshift', 'capability-baseline', 'synthetic']);
      }
    );
  });

  it('refuses to target datasets outside the nightshift namespace', () => {
    expect(
      remoteExamplesFileSchema.safeParse({ dataset: 'deductive/doordashv2', examples: [example] })
        .success
    ).toBe(false);
  });

  it('requires a case id when no LangSmith id identifies the example', () => {
    const { case_id: caseId, ...metadata } = example.metadata;
    expect(remoteExampleSchema.safeParse({ ...example, metadata }).success).toBe(false);
    expect(
      remoteExampleSchema.safeParse({
        ...example,
        metadata: { ...metadata, langsmith_example_id: 'ls-id' },
      }).success
    ).toBe(true);
    expect(caseId).toBe('synthetic-case');
  });

  it('bounds the question by the product limit minus the Elastic constraints suffix', () => {
    const limit = MAX_TEXT_LENGTH - ELASTIC_INVESTIGATION_EVAL_CONSTRAINTS.length;
    expect(
      remoteExampleSchema.safeParse({ ...example, input: { question: 'x'.repeat(limit) } }).success
    ).toBe(true);
    expect(
      remoteExampleSchema.safeParse({ ...example, input: { question: 'x'.repeat(limit + 1) } })
        .success
    ).toBe(false);
  });
});
