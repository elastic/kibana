/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { selectDatasetExamples } from './select_dataset_examples';

describe('selectDatasetExamples', () => {
  const examples = [
    { id: 'both', metadata: { dataset_split: ['suite/a', 'cluster/b'] } },
    { id: 'suite-only', metadata: { dataset_split: ['suite/a'] } },
    { id: 'archived', metadata: { dataset_split: ['suite/a', 'cluster/b'], status: 'archived' } },
    { id: 'unclassified', metadata: {} },
  ];

  it('requires every requested split and excludes archived examples', () => {
    expect(selectDatasetExamples(examples, ['suite/a', 'cluster/b'])).toEqual([examples[0]]);
  });

  it('selects every active example when no split is requested', () => {
    expect(selectDatasetExamples(examples, [])).toEqual([examples[0], examples[1], examples[3]]);
  });

  it('fails when no active examples match', () => {
    expect(() => selectDatasetExamples(examples, ['missing', 'suite/a'])).toThrow(
      'No active examples match missing AND suite/a'
    );
    expect(() => selectDatasetExamples([], [])).toThrow('No active examples match whole dataset');
  });
});
