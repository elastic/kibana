/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { basicCase } from '../../../containers/mock';
import type { CaseUI } from '../../../containers/types';
import { useMergeAction } from './use_merge_action';

jest.mock('../../cases_context/use_cases_context');

const { useCasesContext } = jest.requireMock('../../cases_context/use_cases_context');

const makeCase = (id: string, overrides: Partial<CaseUI> = {}): CaseUI => ({
  ...basicCase,
  id,
  ...overrides,
});

const setPermissions = (permissions: {
  create: boolean;
  update: boolean;
  createComment: boolean;
}) => useCasesContext.mockReturnValue({ permissions });

const renderAction = () => {
  const onAction = jest.fn();
  const onActionSuccess = jest.fn();
  const { result } = renderHook(() => useMergeAction({ onAction, onActionSuccess }));
  return { result, onAction, onActionSuccess };
};

describe('useMergeAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setPermissions({ create: true, update: true, createComment: true });
  });

  describe('canMerge', () => {
    it('does not need the create permission, which only a new destination needs', () => {
      setPermissions({ create: false, update: true, createComment: true });

      expect(renderAction().result.current.canMerge).toBe(true);
    });

    it('is true with update and comment permissions', () => {
      expect(renderAction().result.current.canMerge).toBe(true);
    });

    it.each(['update', 'createComment'] as const)(
      'is false without the %s permission',
      (permission) => {
        setPermissions({ create: true, update: true, createComment: true, [permission]: false });

        expect(renderAction().result.current.canMerge).toBe(false);
      }
    );
  });

  describe('getAction', () => {
    it('is enabled for two cases from one solution', () => {
      const { result } = renderAction();
      const action = result.current.getAction([makeCase('a'), makeCase('b')]);

      expect(action.disabled).toBe(false);
      expect(action.toolTipContent).toBeUndefined();
      expect(action['data-test-subj']).toBe('cases-bulk-action-merge');
    });

    it('is disabled with a reason for one case', () => {
      const { result } = renderAction();
      const action = result.current.getAction([makeCase('a')]);

      expect(action.disabled).toBe(true);
      expect(action.toolTipContent).toBe('Select at least 2 cases to merge.');
    });

    it('is disabled with a reason for cases from different solutions', () => {
      const { result } = renderAction();
      const action = result.current.getAction([
        makeCase('a'),
        makeCase('b', { owner: 'observability' }),
      ]);

      expect(action.disabled).toBe(true);
      expect(action.toolTipContent).toBe('Select cases from one solution to merge them.');
    });

    it('opens the flyout with the selected cases', () => {
      const { result, onAction } = renderAction();
      const selectedCases = [makeCase('a'), makeCase('b')];

      act(() => {
        (result.current.getAction(selectedCases).onClick as () => void)();
      });

      expect(onAction).toHaveBeenCalled();
      expect(result.current.isFlyoutOpen).toBe(true);
      expect(result.current.casesToMerge).toEqual(selectedCases);
    });
  });

  it('closes the flyout and reports success after a merge', () => {
    const { result, onActionSuccess } = renderAction();

    act(() => {
      (result.current.getAction([makeCase('a'), makeCase('b')]).onClick as () => void)();
    });
    act(() => {
      result.current.onMerged();
    });

    expect(result.current.isFlyoutOpen).toBe(false);
    expect(onActionSuccess).toHaveBeenCalled();
  });
});
