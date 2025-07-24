/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { diffExamples } from './diff_examples';
import { ExampleWithId } from '../types';
import { Example } from '@arizeai/phoenix-client/dist/esm/types/datasets';

function withId(example: Example, id: string): ExampleWithId {
  return { ...(example as unknown as ExampleWithId), id };
}

describe('diffExamples', () => {
  const baseExample: Example = {
    input: { prompt: 'hello' },
    output: { completion: 'world' },
    metadata: { split: 'train' },
  };

  const secondExample: Example = {
    input: { prompt: 'foo' },
    output: { completion: 'bar' },
    metadata: { split: 'test' },
  };

  it('returns no changes when the example sets are identical', () => {
    const stored = [withId(baseExample, '1')];
    const next = [baseExample];

    const result = diffExamples(stored, next);

    expect(result).toEqual({ toAdd: [], toDelete: [] });
  });

  it('identifies a new example to add', () => {
    const stored: ExampleWithId[] = [];
    const next = [baseExample];

    const result = diffExamples(stored, next);

    expect(result.toDelete).toEqual([]);
    expect(result.toAdd).toEqual([baseExample]);
  });

  it('identifies an example to delete', () => {
    const stored = [withId(baseExample, '1')];
    const next: Example[] = [];

    const result = diffExamples(stored, next);

    expect(result.toAdd).toEqual([]);
    expect(result.toDelete).toEqual(['1']);
  });

  it('handles a mix of additions and deletions', () => {
    const stored = [withId(baseExample, '1')];
    const next = [secondExample];

    const result = diffExamples(stored, next);

    expect(result.toDelete).toEqual(['1']);
    expect(result.toAdd).toEqual([secondExample]);
  });

  it('considers examples equivalent after normalisation (undefined vs null / missing metadata)', () => {
    const stored = [
      withId(
        {
          input: { prompt: 'normalize' },
          output: null,
          metadata: {},
        },
        'norm-1'
      ),
    ];

    const next: Example[] = [
      {
        input: { prompt: 'normalize' },
        metadata: {},
        output: null,
      },
    ];

    const result = diffExamples(stored, next);

    expect(result).toEqual({ toAdd: [], toDelete: [] });
  });
});
