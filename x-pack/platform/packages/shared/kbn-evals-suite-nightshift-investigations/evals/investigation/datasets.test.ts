/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { readInvestigationDataset } from './datasets';

describe('investigation file dataset', () => {
  const directory = mkdtempSync(join(tmpdir(), 'nightshift-dataset-'));
  const path = join(directory, 'examples.json');

  afterAll(() => rmSync(directory, { recursive: true, force: true }));

  it('loads questions and stable case IDs without labels or grader metadata', () => {
    writeFileSync(
      path,
      JSON.stringify({
        dataset: 'nightshift/synthetic-test',
        examples: [
          {
            input: { question: 'Investigate the synthetic timeout.' },
            metadata: { case_id: 'timeout' },
          },
        ],
      })
    );

    expect(readInvestigationDataset(path)).toMatchObject({
      name: 'nightshift/synthetic-test',
      examples: [
        {
          input: { question: 'Investigate the synthetic timeout.' },
          metadata: { case_id: 'timeout' },
        },
      ],
    });
  });

  it('rejects duplicate case IDs instead of reporting ambiguous example coverage', () => {
    writeFileSync(
      path,
      JSON.stringify({
        dataset: 'nightshift/synthetic-test',
        examples: [
          { input: { question: 'First question' }, metadata: { case_id: 'duplicate' } },
          { input: { question: 'Second question' }, metadata: { case_id: 'duplicate' } },
        ],
      })
    );
    expect(() => readInvestigationDataset(path)).toThrow('Duplicate case_id');
  });

  it.each([
    { dataset: 'nightshift/empty', examples: [] },
    {
      dataset: 'another-owner/examples',
      examples: [{ input: { question: 'Question' }, metadata: { case_id: 'case' } }],
    },
    {
      dataset: 'nightshift/invalid',
      examples: [{ input: { question: '   ' }, metadata: { case_id: 'case' } }],
    },
    {
      dataset: 'nightshift/invalid',
      examples: [{ input: { question: 'Question' }, metadata: {} }],
    },
  ])('rejects an empty or malformed dataset: %j', (file) => {
    writeFileSync(path, JSON.stringify(file));
    expect(() => readInvestigationDataset(path)).toThrow();
  });

  it('preserves optional reference answers and operator metadata', () => {
    const example = {
      input: { question: 'Investigate the signal.' },
      output: { reference_answer: 'An optional label' },
      metadata: { case_id: 'signal', source: 'operator', max_latency_seconds: 300 },
    };
    writeFileSync(path, JSON.stringify({ dataset: 'nightshift/optional', examples: [example] }));
    expect(readInvestigationDataset(path).examples).toEqual([example]);
  });

  it('rejects invalid JSON', () => {
    writeFileSync(path, '{');
    expect(() => readInvestigationDataset(path)).toThrow();
  });
});
