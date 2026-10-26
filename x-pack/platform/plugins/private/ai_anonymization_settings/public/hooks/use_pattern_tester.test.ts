/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { act, renderHook } from '@testing-library/react';
import type { RegexAnonymizationRule } from '@kbn/ai-anonymization-common';
import { usePatternTester } from './use_pattern_tester';
import { useKibana } from './use_kibana';

jest.mock('./use_kibana', () => ({
  useKibana: jest.fn(),
}));

const rules: RegexAnonymizationRule[] = [
  { type: 'RegExp', id: 'r1', entityClass: 'HOST_NAME', pattern: 'a', enabled: true },
];

describe('usePatternTester', () => {
  const post = jest.fn();
  const addDanger = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    post.mockRejectedValue({ body: { message: 'The pattern tester is disabled' } });
    (useKibana as jest.Mock).mockReturnValue({
      services: { http: { post }, notifications: { toasts: { addDanger } } },
    });
  });

  // Optional previews (e.g. the built-in table's example column) must not spam the user with an
  // error toast each time they open a page when the tester is turned off.
  it('shows an error toast when a test fails and the caller did not ask for silence', async () => {
    const { result } = renderHook(() => usePatternTester());

    await act(async () => {
      await result.current.test({}, rules);
    });

    expect(addDanger).toHaveBeenCalledWith({ title: 'The pattern tester is disabled' });
    expect(result.current.error).toBe('The pattern tester is disabled');
  });

  it('suppresses the toast but still records the error when silent', async () => {
    const { result } = renderHook(() => usePatternTester());

    await act(async () => {
      await result.current.test({}, rules, { silent: true });
    });

    expect(addDanger).not.toHaveBeenCalled();
    expect(result.current.error).toBe('The pattern tester is disabled');
  });

  it('drops the previous result when a later test fails, so stale output is not shown for the new input', async () => {
    const previous = { maskedInput: {}, anonymizations: [], stats: {} };
    post.mockResolvedValueOnce(previous).mockRejectedValueOnce(new Error('timed out'));
    const { result } = renderHook(() => usePatternTester());

    await act(async () => {
      await result.current.test({}, rules);
    });
    expect(result.current.result).toEqual(previous);

    await act(async () => {
      await result.current.test({}, rules);
    });
    expect(result.current.result).toBeUndefined();
    expect(result.current.error).toBe('timed out');
  });
});
