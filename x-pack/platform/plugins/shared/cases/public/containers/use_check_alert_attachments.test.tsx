/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useCheckAlertAttachments } from './use_check_alert_attachments';

// Mock the user actions hook used by the implementation
import { useFindCasesUserActions as realUseFindCasesUserActions } from './use_find_case_user_actions';
jest.mock('./use_find_case_user_actions', () => ({
  useFindCasesUserActions: jest.fn(),
}));
const useFindCasesUserActions = realUseFindCasesUserActions as jest.Mock;

function makeAlertUserAction(alertIds: string[] | string) {
  return {
    type: 'comment',
    payload: {
      comment: {
        type: 'alert',
        alertId: Array.isArray(alertIds) ? alertIds : [alertIds],
      },
    },
  };
}

function makeQueryResult(caseId: string, userActions: Array<Record<string, unknown>> = []) {
  return {
    isSuccess: true,
    data: {
      caseId,
      userActions,
      page: 1,
      perPage: Math.max(userActions.length, 1),
      total: userActions.length,
    },
  };
}

describe('useCheckAlertAttachments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an empty set when no cases provided', () => {
    useFindCasesUserActions.mockReturnValue([]);

    const { result } = renderHook(() =>
      useCheckAlertAttachments({
        cases: [],
        getAttachments: () => [],
      })
    );

    expect(result.current.disabledCases).toBeInstanceOf(Set);
    expect(result.current.disabledCases.size).toBe(0);
    expect(useFindCasesUserActions).toHaveBeenCalledWith([]);
  });

  it('returns cases that already contain the single selected alert', () => {
    const cases = [{ id: 'case-1' }, { id: 'case-2' }];

    useFindCasesUserActions.mockImplementation((args: Array<{ caseId: string }>) => {
      expect(args.map((a) => a.caseId)).toEqual(['case-1', 'case-2']);
      return [
        makeQueryResult('case-1', [makeAlertUserAction(['a1', 'a2'])]),
        makeQueryResult('case-2', [makeAlertUserAction(['a2']), makeAlertUserAction(['a3'])]),
      ];
    });

    const { result } = renderHook(() =>
      useCheckAlertAttachments({
        cases,
        // @ts-expect-error partial implementation for testing
        getAttachments: () => [{ alertId: 'a2' }],
      })
    );

    expect(result.current.disabledCases.size).toBe(2);
    expect(result.current.disabledCases.has('case-1')).toBe(true);
    expect(result.current.disabledCases.has('case-2')).toBe(true);
  });

  it('returns only cases that contain all selected alerts', () => {
    const cases = [{ id: 'c1' }, { id: 'c2' }];

    // c1 has x and y; c2 has only y
    useFindCasesUserActions.mockReturnValue([
      makeQueryResult('c1', [makeAlertUserAction(['x', 'y'])]),
      makeQueryResult('c2', [makeAlertUserAction(['y'])]),
    ]);

    const { result } = renderHook(() =>
      useCheckAlertAttachments({
        cases,
        // @ts-expect-error partial implementation for testing
        getAttachments: () => [{ alertId: 'x' }, { alertId: 'y' }],
      })
    );

    expect(result.current.disabledCases.size).toBe(1);
    expect(result.current.disabledCases.has('c1')).toBe(true);
    expect(result.current.disabledCases.has('c2')).toBe(false);
  });

  it('ignores cases that do not include the selected alert', () => {
    const cases = [{ id: 'c1' }];

    useFindCasesUserActions.mockReturnValue([
      makeQueryResult('c1', [makeAlertUserAction('only-this')]),
    ]);

    const { result } = renderHook(() =>
      useCheckAlertAttachments({
        cases,
        // @ts-expect-error partial implementation for testing
        getAttachments: () => [{ alertId: 'not-this' }],
      })
    );

    expect(result.current.disabledCases.size).toBe(0);
    expect(result.current.disabledCases.has('c1')).toBe(false);
  });

  it('skips comparisons when selected count exceeds case attachments', () => {
    const cases = [{ id: 'c1' }];

    useFindCasesUserActions.mockReturnValue([makeQueryResult('c1', [makeAlertUserAction(['a1'])])]);

    const { result } = renderHook(() =>
      useCheckAlertAttachments({
        cases,
        // @ts-expect-error partial implementation for testing
        getAttachments: () => [{ alertId: 'a1' }, { alertId: 'a2' }],
      })
    );

    expect(result.current.disabledCases.size).toBe(0);
  });

  it('continues when a case query is not successful', () => {
    const cases = [{ id: 'c1' }, { id: 'c2' }];

    useFindCasesUserActions.mockReturnValue([
      { isSuccess: false, error: new Error('boom') },
      makeQueryResult('c2', [makeAlertUserAction('ok')]),
    ]);

    const { result } = renderHook(() =>
      useCheckAlertAttachments({
        cases,
        // @ts-expect-error partial implementation for testing
        getAttachments: () => [{ alertId: 'ok' }],
      })
    );

    expect(result.current.disabledCases.size).toBe(1);
    expect(result.current.disabledCases.has('c2')).toBe(true);
  });
});
