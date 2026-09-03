/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fallbackBind, buildFallbackBindPrompt } from './fallback_bind';
import type { ClassifiedColumn } from './classify_columns';

const columns: ClassifiedColumn[] = [
  {
    name: 'a',
    type: 'long',
    kind: 'numeric',
    role: 'measure',
    sourceFields: ['a'],
  },
  {
    name: 'b',
    type: 'long',
    kind: 'numeric',
    role: 'measure',
    sourceFields: ['b'],
  },
];

describe('fallbackBind', () => {
  it('returns the chosen candidate column', async () => {
    const result = await fallbackBind(
      { slot: 'secondary', candidates: ['a', 'b'], columns },
      async () => '{"column":"b"}'
    );
    expect(result).toEqual({ column: 'b' });
  });

  it('returns ambiguous when the model picks a non-candidate', async () => {
    const result = await fallbackBind(
      { slot: 'secondary', candidates: ['a', 'b'], columns },
      async () => '{"column":"z"}'
    );
    expect(result).toEqual({ ambiguous: 'secondary', candidates: ['a', 'b'] });
  });

  it('lists columns in the prompt', () => {
    expect(
      buildFallbackBindPrompt({ slot: 'secondary', candidates: ['a', 'b'], columns })
    ).toContain('- a (long, measure)');
  });
});
