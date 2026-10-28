/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import type { Filter } from '@kbn/es-query';
import { useMaintenanceWindowScope } from './use_maintenance_window_scope';

const sampleFilter = { meta: { key: 'host.name' }, query: { match_all: {} } } as Filter;

describe('useMaintenanceWindowScope', () => {
  it('defaults to disabled empty state when initial is undefined', () => {
    const { result } = renderHook(() => useMaintenanceWindowScope());

    expect(result.current.enabled).toBe(false);
    expect(result.current.kql).toBe('');
    expect(result.current.filters).toEqual([]);
    expect(result.current.errors).toEqual([]);
  });

  it('treats null initial as selected with no filter', () => {
    const { result } = renderHook(() => useMaintenanceWindowScope(null));

    expect(result.current.enabled).toBe(true);
    expect(result.current.kql).toBe('');
    expect(result.current.filters).toEqual([]);
  });

  it('seeds kql and filters from initial', () => {
    const { result } = renderHook(() =>
      useMaintenanceWindowScope({ kql: 'kibana.alert.status: active', filters: [sampleFilter] })
    );

    expect(result.current.enabled).toBe(true);
    expect(result.current.kql).toBe('kibana.alert.status: active');
    expect(result.current.filters).toEqual([sampleFilter]);
  });

  it('clears errors on toggle', () => {
    const { result } = renderHook(() => useMaintenanceWindowScope());

    act(() => {
      result.current.setErrors(['invalid']);
    });
    expect(result.current.errors).toEqual(['invalid']);

    act(() => {
      result.current.onToggle(true);
    });

    expect(result.current.enabled).toBe(true);
    expect(result.current.errors).toEqual([]);
  });

  it('clears errors on kql change', () => {
    const { result } = renderHook(() => useMaintenanceWindowScope());

    act(() => {
      result.current.setErrors(['invalid']);
    });

    act(() => {
      result.current.onKqlChange('host.name: foo');
    });

    expect(result.current.kql).toBe('host.name: foo');
    expect(result.current.errors).toEqual([]);
  });

  it('updates filters without clearing errors', () => {
    const { result } = renderHook(() => useMaintenanceWindowScope());

    act(() => {
      result.current.setErrors(['invalid']);
      result.current.onFiltersChange([sampleFilter]);
    });

    expect(result.current.filters).toEqual([sampleFilter]);
    expect(result.current.errors).toEqual(['invalid']);
  });
});
