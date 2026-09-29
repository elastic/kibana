/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { invert } from 'lodash/fp';

import { getAnonymizedValue } from '.';

vi.mock('uuid', () => {
  const mocked = {
    v4: () => 'test-uuid',
  };
  return { ...mocked, default: mocked };
});

describe('getAnonymizedValue', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a new UUID when currentReplacements is not provided', () => {
    const currentReplacements = undefined;
    const rawValue = 'test';

    const result = getAnonymizedValue({ currentReplacements, rawValue });

    expect(result).toBe('test-uuid');
  });

  it('returns an existing anonymized value when currentReplacements contains an entry for it', () => {
    const rawValue = 'test';
    const currentReplacements = { anonymized: 'test' };
    const rawValueToReplacement = invert(currentReplacements);

    const result = getAnonymizedValue({ currentReplacements, rawValue });
    expect(result).toBe(rawValueToReplacement[rawValue]);
  });

  it('returns a new UUID with currentReplacements if no existing match', () => {
    const rawValue = 'test';
    const currentReplacements = { anonymized: 'other' };

    const result = getAnonymizedValue({ currentReplacements, rawValue });

    expect(result).toBe('test-uuid');
  });
});
