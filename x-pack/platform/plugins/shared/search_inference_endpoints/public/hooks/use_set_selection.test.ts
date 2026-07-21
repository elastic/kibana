/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useSetSelection } from './use_set_selection';

const ALL_KEYS = ['a', 'b', 'c'];

describe('useSetSelection', () => {
  // ---------------------------------------------------------------------------
  // seed
  // ---------------------------------------------------------------------------
  describe('seed', () => {
    it('sets selected and initial to the provided keys', () => {
      const { result } = renderHook(() => useSetSelection(ALL_KEYS));

      act(() => result.current.seed(new Set(['a', 'b'])));

      expect(result.current.selected).toEqual(new Set(['a', 'b']));
      expect(result.current.isDirty).toBe(false);
    });

    it('creates independent copies — mutating the input Set after seed does not affect state', () => {
      const { result } = renderHook(() => useSetSelection(ALL_KEYS));
      const input = new Set(['a', 'b']);

      act(() => result.current.seed(input));
      input.add('c'); // mutate after seeding

      expect(result.current.selected).toEqual(new Set(['a', 'b']));
      expect(result.current.isDirty).toBe(false);
    });

    it('selected and initial do not share the same Set reference', () => {
      const { result } = renderHook(() => useSetSelection(ALL_KEYS));

      act(() => result.current.seed(new Set(['a'])));

      // They should be equal in value but not the same object.
      expect(result.current.selected).toEqual(new Set(['a']));
      expect(result.current.isDirty).toBe(false);
    });

    it('isDirty is false immediately after seed', () => {
      const { result } = renderHook(() => useSetSelection(ALL_KEYS));

      act(() => result.current.seed(new Set(['a', 'b', 'c'])));

      expect(result.current.isDirty).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // toggle
  // ---------------------------------------------------------------------------
  describe('toggle', () => {
    it('adds a key that is not yet selected', () => {
      const { result } = renderHook(() => useSetSelection(ALL_KEYS));

      act(() => result.current.toggle('a'));

      expect(result.current.selected.has('a')).toBe(true);
      expect(result.current.totalSelected).toBe(1);
    });

    it('removes a key that is already selected', () => {
      const { result } = renderHook(() => useSetSelection(ALL_KEYS));
      act(() => result.current.seed(new Set(['a', 'b'])));

      act(() => result.current.toggle('a'));

      expect(result.current.selected.has('a')).toBe(false);
      expect(result.current.totalSelected).toBe(1);
    });

    it('marks isDirty after toggling away from the initial state', () => {
      const { result } = renderHook(() => useSetSelection(ALL_KEYS));
      act(() => result.current.seed(new Set(['a', 'b'])));

      act(() => result.current.toggle('a'));

      expect(result.current.isDirty).toBe(true);
    });

    it('isDirty is false when toggling back to the initial state', () => {
      const { result } = renderHook(() => useSetSelection(ALL_KEYS));
      act(() => result.current.seed(new Set(['a', 'b'])));

      act(() => result.current.toggle('a')); // remove
      act(() => result.current.toggle('a')); // add back

      expect(result.current.isDirty).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // selectAll
  // ---------------------------------------------------------------------------
  describe('selectAll', () => {
    it('selects all keys when none are selected', () => {
      const { result } = renderHook(() => useSetSelection(ALL_KEYS));

      act(() => result.current.selectAll());

      expect(result.current.selected).toEqual(new Set(ALL_KEYS));
      expect(result.current.allSelected).toBe(true);
    });

    it('deselects all keys when all are already selected', () => {
      const { result } = renderHook(() => useSetSelection(ALL_KEYS));
      act(() => result.current.seed(new Set(ALL_KEYS)));

      act(() => result.current.selectAll());

      expect(result.current.selected.size).toBe(0);
      expect(result.current.allSelected).toBe(false);
    });

    it('selects all when only a subset is selected', () => {
      const { result } = renderHook(() => useSetSelection(ALL_KEYS));
      act(() => result.current.seed(new Set(['a'])));

      act(() => result.current.selectAll());

      expect(result.current.selected).toEqual(new Set(ALL_KEYS));
    });
  });

  // ---------------------------------------------------------------------------
  // isDirty
  // ---------------------------------------------------------------------------
  describe('isDirty', () => {
    it('is false before any seeding', () => {
      const { result } = renderHook(() => useSetSelection(ALL_KEYS));

      expect(result.current.isDirty).toBe(false);
    });

    it('is true when selected has more keys than initial', () => {
      const { result } = renderHook(() => useSetSelection(ALL_KEYS));
      act(() => result.current.seed(new Set(['a'])));

      act(() => result.current.toggle('b'));

      expect(result.current.isDirty).toBe(true);
    });

    it('is true when selected has fewer keys than initial', () => {
      const { result } = renderHook(() => useSetSelection(ALL_KEYS));
      act(() => result.current.seed(new Set(['a', 'b'])));

      act(() => result.current.toggle('a'));

      expect(result.current.isDirty).toBe(true);
    });

    it('is true when selected has same count but different keys than initial', () => {
      const { result } = renderHook(() => useSetSelection(ALL_KEYS));
      act(() => result.current.seed(new Set(['a', 'b'])));

      act(() => result.current.toggle('b')); // remove b
      act(() => result.current.toggle('c')); // add c → still size 2 but different

      expect(result.current.isDirty).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // allSelected / total / totalSelected
  // ---------------------------------------------------------------------------
  describe('allSelected, total, totalSelected', () => {
    it('allSelected is false when allKeys is empty', () => {
      const { result } = renderHook(() => useSetSelection([]));

      expect(result.current.allSelected).toBe(false);
    });

    it('allSelected is true only when selected matches allKeys length', () => {
      const { result } = renderHook(() => useSetSelection(ALL_KEYS));
      act(() => result.current.seed(new Set(ALL_KEYS)));

      expect(result.current.allSelected).toBe(true);

      act(() => result.current.toggle('a'));

      expect(result.current.allSelected).toBe(false);
    });

    it('total always reflects allKeys length', () => {
      const { result } = renderHook(() => useSetSelection(ALL_KEYS));

      expect(result.current.total).toBe(3);
    });

    it('totalSelected tracks selected.size', () => {
      const { result } = renderHook(() => useSetSelection(ALL_KEYS));
      act(() => result.current.seed(new Set(['a', 'b'])));

      expect(result.current.totalSelected).toBe(2);

      act(() => result.current.toggle('a'));

      expect(result.current.totalSelected).toBe(1);
    });
  });
});
