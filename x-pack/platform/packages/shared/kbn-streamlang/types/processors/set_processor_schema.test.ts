/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { streamlangProcessorSchema } from '.';

describe('setProcessorSchema (via streamlangProcessorSchema)', () => {
  const base = { action: 'set' as const, to: 'attributes.field' };

  it('accepts literal false as value (must not treat falsy value as absent)', () => {
    expect(() =>
      streamlangProcessorSchema.parse({
        ...base,
        value: false,
      })
    ).not.toThrow();
  });

  it('accepts other falsy literals as value when allowed by value schema', () => {
    expect(() =>
      streamlangProcessorSchema.parse({
        ...base,
        value: 0,
      })
    ).not.toThrow();

    expect(() =>
      streamlangProcessorSchema.parse({
        ...base,
        value: '',
      })
    ).not.toThrow();
  });

  it('rejects missing both value and copy_from', () => {
    expect(() => streamlangProcessorSchema.parse({ ...base })).toThrow();
  });

  it('rejects both value and copy_from', () => {
    expect(() =>
      streamlangProcessorSchema.parse({
        ...base,
        value: true,
        copy_from: 'other.field',
      })
    ).toThrow();
  });
});
