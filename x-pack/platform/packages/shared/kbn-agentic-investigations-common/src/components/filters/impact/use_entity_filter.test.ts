/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import type { ImpactPill } from './impact_pills';
import { useEntityFilter } from './use_entity_filter';

describe('useEntityFilter', () => {
  const pill = (entityId: string, count = 1): ImpactPill => ({ entityId, count });
  const items = [pill('host-1'), pill('user-1')];
  const page = (pills: ImpactPill[], total = pills.length) => ({ pills, total });

  it('starts without a selection', () => {
    const { result } = renderHook(() => useEntityFilter(page(items)));

    expect(result.current.entityFilter).toBeNull();
    expect(result.current.selectedPill).toBeNull();
  });

  it('selects a loaded pill', () => {
    const { result } = renderHook(() => useEntityFilter(page(items)));

    act(() => result.current.setEntityFilter('host-1'));

    expect(result.current.entityFilter).toBe('host-1');
    expect(result.current.selectedPill).toEqual(pill('host-1'));
  });

  it('keeps the selection when its pill falls off the loaded pages', () => {
    const { result, rerender } = renderHook(({ rows }) => useEntityFilter(page(rows, 25)), {
      initialProps: { rows: items },
    });
    act(() => result.current.setEntityFilter('host-1'));

    rerender({ rows: [pill('user-1')] });

    expect(result.current.entityFilter).toBe('host-1');
    expect(result.current.selectedPill).toEqual(pill('host-1'));
  });

  it('refreshes the selected pill from the loaded pages', () => {
    const { result, rerender } = renderHook(({ rows }) => useEntityFilter(page(rows)), {
      initialProps: { rows: items },
    });
    act(() => result.current.setEntityFilter('host-1'));

    rerender({ rows: [pill('host-1', 7)] });

    expect(result.current.selectedPill).toEqual(pill('host-1', 7));
  });

  it('clears the selection with null', () => {
    const { result } = renderHook(() => useEntityFilter(page(items)));
    act(() => result.current.setEntityFilter('host-1'));

    act(() => result.current.setEntityFilter(null));

    expect(result.current.entityFilter).toBeNull();
  });

  it('does not bring a cleared selection back when pills return', () => {
    const { result, rerender } = renderHook(({ rows }) => useEntityFilter(page(rows)), {
      initialProps: { rows: items },
    });
    act(() => result.current.setEntityFilter('host-1'));
    rerender({ rows: [] });

    rerender({ rows: items });

    expect(result.current.entityFilter).toBeNull();
  });

  it('clears the selection once the queue has no pills at all', () => {
    const { result, rerender } = renderHook(({ rows }) => useEntityFilter(page(rows)), {
      initialProps: { rows: items },
    });
    act(() => result.current.setEntityFilter('host-1'));

    rerender({ rows: [] });

    expect(result.current.entityFilter).toBeNull();
  });
});
