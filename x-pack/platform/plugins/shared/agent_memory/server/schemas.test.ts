/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { recallInputSchema } from './schemas';

describe('Agent Memory schemas', () => {
  it('accepts bounded tags for explicit recall', () => {
    expect(
      recallInputSchema.parse({
        query: 'deployment history',
        tags: ['project:phoenix', 'source:workflow'],
      })
    ).toEqual({
      query: 'deployment history',
      tags: ['project:phoenix', 'source:workflow'],
      limit: 10,
    });
  });

  it('rejects more than 20 recall tags', () => {
    expect(
      recallInputSchema.safeParse({
        query: 'deployment history',
        tags: Array.from({ length: 21 }, (_, index) => `tag-${index}`),
      }).success
    ).toBe(false);
  });
});
