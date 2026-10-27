/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexPattern, LensAppState, LensState } from '@kbn/lens-common';
import {
  selectAdHocDataViews,
  selectApplyChangesCounter,
  selectChangesApplied,
  selectExecutionContext,
  selectExecutionContextSearch,
} from '.';
import { initialState } from './lens_slice';

describe('lens selectors', () => {
  describe('selecting changes applied', () => {
    it('should be true when auto-apply disabled and flag is set', () => {
      const lensState = {
        changesApplied: true,
        autoApplyDisabled: true,
      } as Partial<LensAppState>;

      expect(selectChangesApplied({ lens: lensState as LensAppState })).toBeTruthy();
    });

    it('should be false when auto-apply disabled and flag is false', () => {
      const lensState = {
        changesApplied: false,
        autoApplyDisabled: true,
      } as Partial<LensAppState>;

      expect(selectChangesApplied({ lens: lensState as LensAppState })).toBeFalsy();
    });

    it('should be true when auto-apply enabled no matter what', () => {
      const lensState = {
        changesApplied: false,
        autoApplyDisabled: false,
      } as Partial<LensAppState>;

      expect(selectChangesApplied({ lens: lensState as LensAppState })).toBeTruthy();
    });
  });
  it('selects the apply counter without consuming it or sharing state between stores', () => {
    const first = { lens: { ...initialState, applyChangesCounter: 1 } };
    const second = { lens: { ...initialState, applyChangesCounter: 2 } };

    expect(selectApplyChangesCounter(first)).toBe(1);
    expect(selectApplyChangesCounter(first)).toBe(1);
    expect(selectApplyChangesCounter(second)).toBe(2);
    expect(selectApplyChangesCounter(first)).toBe(1);
    expect(selectApplyChangesCounter({ lens: initialState })).toBeUndefined();
  });

  it('memoizes ad-hoc data views and recomputes when index patterns change', () => {
    const adHoc: IndexPattern = {
      id: 'ad-hoc',
      title: 'logs-*',
      spec: { id: 'ad-hoc', title: 'logs-*' },
      isPersisted: false,
      fields: [],
      hasRestrictions: false,
      getFieldByName: () => undefined,
      getFormatterForField: () => undefined,
    };
    const persisted = { ...adHoc, id: 'persisted', isPersisted: true };
    const state: LensState = {
      lens: {
        ...initialState,
        dataViews: {
          indexPatterns: { 'ad-hoc': adHoc, persisted },
          indexPatternRefs: [],
        },
      },
    };
    const result = selectAdHocDataViews(state);

    expect(result).toEqual({ 'ad-hoc': adHoc.spec });
    expect(selectAdHocDataViews(state)).toBe(result);
    expect(selectAdHocDataViews({ lens: { ...state.lens, isSaveable: true } })).toBe(result);
    expect(
      selectAdHocDataViews({
        lens: { ...state.lens, dataViews: { indexPatterns: {}, indexPatternRefs: [] } },
      })
    ).toEqual({});
  });

  it('keeps execution context timestamps stable until context inputs change', () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1000);
    try {
      const state = { lens: initialState };
      const context = selectExecutionContext(state);
      const searchContext = selectExecutionContextSearch(state);
      now.mockReturnValue(2000);
      const unrelatedUpdate = { lens: { ...initialState, isSaveable: true } };

      expect(selectExecutionContext(unrelatedUpdate)).toBe(context);
      expect(selectExecutionContextSearch(unrelatedUpdate)).toBe(searchContext);
      expect(context.now).toBe(1000);

      const changedQuery = {
        lens: { ...initialState, query: { language: 'kuery', query: 'status:200' } },
      };
      expect(selectExecutionContext(changedQuery).now).toBe(2000);
      expect(selectExecutionContextSearch(changedQuery).now).toBe(2000);
    } finally {
      now.mockRestore();
    }
  });
});
