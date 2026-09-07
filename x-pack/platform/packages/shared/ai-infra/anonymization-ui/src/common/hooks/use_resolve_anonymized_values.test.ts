/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useGetReplacements } from '../services/replacements/hooks/use_get_replacements';
import { useResolveAnonymizedValues } from './use_resolve_anonymized_values';

jest.mock('../services/replacements/hooks/use_get_replacements', () => ({
  useGetReplacements: jest.fn(),
}));

const client = {
  getReplacements: jest.fn(),
  deanonymizeText: jest.fn(),
  getTokenToOriginalMap: jest.fn(),
};

const setReplacementsQuery = (overrides = {}) => {
  jest.mocked(useGetReplacements).mockReturnValue({
    data: undefined,
    isLoading: false,
    error: undefined,
    ...overrides,
  } as never);
};

describe('useResolveAnonymizedValues', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setReplacementsQuery();
  });

  it('uses inline deanonymization metadata when replacements id is not available', () => {
    const { result } = renderHook(() =>
      useResolveAnonymizedValues({
        client,
        inlineDeanonymizations: [{ entity: { mask: 'EMAIL_1', value: 'alice@example.com' } }],
      })
    );

    expect(result.current.resolveText('contact EMAIL_1')).toBe('contact alice@example.com');
  });

  it('prioritizes replacements-id mappings over inline metadata', () => {
    setReplacementsQuery({
      data: {
        id: 'rep-1',
        namespace: 'default',
        replacements: [{ anonymized: 'EMAIL_1', original: 'from_replacements@example.com' }],
      },
    });

    const { result } = renderHook(() =>
      useResolveAnonymizedValues({
        client,
        replacementsId: 'rep-1',
        inlineDeanonymizations: [{ entity: { mask: 'EMAIL_1', value: 'from_inline@example.com' } }],
      })
    );

    expect(result.current.resolveText('contact EMAIL_1')).toBe(
      'contact from_replacements@example.com'
    );
  });

  it('passes through unresolved values when no mapping exists', () => {
    const { result } = renderHook(() =>
      useResolveAnonymizedValues({
        client,
      })
    );

    expect(result.current.resolveText('nothing to replace')).toBe('nothing to replace');
  });
});
