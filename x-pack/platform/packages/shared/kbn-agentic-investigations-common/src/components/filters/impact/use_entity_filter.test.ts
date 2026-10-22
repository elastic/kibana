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
  const pill = (entityId: string): ImpactPill => ({ entityId, count: 1 });
  const items = [pill('host-1'), pill('user-1')];

  it('starts without a selection', () => {
    const { result } = renderHook(() => useEntityFilter(items));

    expect(result.current.entityFilter).toBeNull();
  });

  it('keeps a selection whose pill is still available', () => {
    const { result } = renderHook(() => useEntityFilter(items));

    act(() => result.current.setEntityFilter('host-1'));

    expect(result.current.entityFilter).toBe('host-1');
  });

  it('clears the selection once its entity drops out of the pills', () => {
    const { result, rerender } = renderHook(({ rows }) => useEntityFilter(rows), {
      initialProps: { rows: items },
    });
    act(() => result.current.setEntityFilter('host-1'));

    rerender({ rows: [pill('user-1')] });

    expect(result.current.entityFilter).toBeNull();
  });

  it('does not bring a cleared selection back when its entity reappears', () => {
    const { result, rerender } = renderHook(({ rows }) => useEntityFilter(rows), {
      initialProps: { rows: items },
    });
    act(() => result.current.setEntityFilter('host-1'));
    rerender({ rows: [pill('user-1')] });

    rerender({ rows: items });

    expect(result.current.entityFilter).toBeNull();
  });
});
