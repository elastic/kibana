/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { validateQuery } from '@kbn/esql-language';
import { useTabQueryValidation } from './use_tab_query_validation';

jest.mock('@kbn/esql-language', () => ({
  validateQuery: jest.fn(),
}));

const mockValidateQuery = validateQuery as jest.Mock;
const callbacks = {};

const noErrors = { errors: [], warnings: [] };
const withErrors = { errors: [{ text: 'bad query' }], warnings: [] };

describe('useTabQueryValidation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockValidateQuery.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reports no errors before the debounce elapses', async () => {
    mockValidateQuery.mockResolvedValue(withErrors);

    const { result } = renderHook(() =>
      useTabQueryValidation({ queries: { alert: 'FROM logs-* | garbage' }, callbacks })
    );

    expect(result.current.hasErrors).toBe(false);
    expect(mockValidateQuery).not.toHaveBeenCalled();
  });

  it('marks a tab as errored when its query fails validation', async () => {
    mockValidateQuery.mockImplementation(async (query: string) =>
      query.includes('garbage') ? withErrors : noErrors
    );

    const { result } = renderHook(() =>
      useTabQueryValidation({
        queries: { base: 'FROM logs-*', alert: 'FROM logs-* | garbage' },
        callbacks,
      })
    );

    await jest.advanceTimersByTimeAsync(300);

    expect(result.current.errorTabs).toEqual(['alert']);
    expect(result.current.hasErrors).toBe(true);
  });

  it('does not validate tabs with empty query text', async () => {
    mockValidateQuery.mockResolvedValue(noErrors);

    const { result } = renderHook(() =>
      useTabQueryValidation({ queries: { base: 'FROM logs-*', recovery: '' }, callbacks })
    );

    await jest.advanceTimersByTimeAsync(300);

    expect(mockValidateQuery).toHaveBeenCalledTimes(1);
    expect(mockValidateQuery).toHaveBeenCalledWith('FROM logs-*', callbacks);
    expect(result.current.hasErrors).toBe(false);
  });

  it('reports no errors once every non-empty tab validates cleanly', async () => {
    mockValidateQuery.mockResolvedValue(noErrors);

    const { result } = renderHook(() =>
      useTabQueryValidation({
        queries: { base: 'FROM logs-*', alert: 'FROM logs-* | WHERE cpu > 70' },
        callbacks,
      })
    );

    await jest.advanceTimersByTimeAsync(300);

    expect(result.current.errorTabs).toEqual([]);
    expect(result.current.hasErrors).toBe(false);
  });

  it('treats a validation exception as no error rather than throwing', async () => {
    mockValidateQuery.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() =>
      useTabQueryValidation({ queries: { alert: 'FROM logs-*' }, callbacks })
    );

    await jest.advanceTimersByTimeAsync(300);

    expect(result.current.hasErrors).toBe(false);
  });
});
