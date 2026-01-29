/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';

import { TestProviders } from '../../../common/mock';
import { useTemplatesState } from './use_templates_state';
import type { Template } from '../types';

describe('useTemplatesState', () => {
  const wrapper = ({ children }: React.PropsWithChildren<{}>) => (
    <TestProviders>{children}</TestProviders>
  );

  it('returns default query params', () => {
    const { result } = renderHook(() => useTemplatesState(), { wrapper });

    expect(result.current.queryParams).toEqual({
      page: 1,
      perPage: 10,
      sortField: 'name',
      sortOrder: 'asc',
      search: '',
    });
  });

  it('returns empty selected templates by default', () => {
    const { result } = renderHook(() => useTemplatesState(), { wrapper });

    expect(result.current.selectedTemplates).toEqual([]);
  });

  it('returns sorting configuration', () => {
    const { result } = renderHook(() => useTemplatesState(), { wrapper });

    expect(result.current.sorting).toEqual({
      sort: {
        field: 'name',
        direction: 'asc',
      },
    });
  });

  it('returns selection configuration', () => {
    const { result } = renderHook(() => useTemplatesState(), { wrapper });

    expect(result.current.selection).toHaveProperty('onSelectionChange');
    expect(result.current.selection).toHaveProperty('selected');
    expect(result.current.selection.selected).toEqual([]);
  });

  it('updates query params correctly', () => {
    const { result } = renderHook(() => useTemplatesState(), { wrapper });

    act(() => {
      result.current.setQueryParams({ page: 2, perPage: 25 });
    });

    expect(result.current.queryParams).toEqual({
      page: 2,
      perPage: 25,
      sortField: 'name',
      sortOrder: 'asc',
      search: '',
    });
  });

  it('updates search correctly', () => {
    const { result } = renderHook(() => useTemplatesState(), { wrapper });

    act(() => {
      result.current.setQueryParams({ search: 'test search' });
    });

    expect(result.current.queryParams.search).toBe('test search');
  });

  it('updates sorting correctly', () => {
    const { result } = renderHook(() => useTemplatesState(), { wrapper });

    act(() => {
      result.current.setQueryParams({ sortField: 'lastUpdate', sortOrder: 'desc' });
    });

    expect(result.current.queryParams.sortField).toBe('lastUpdate');
    expect(result.current.queryParams.sortOrder).toBe('desc');
    expect(result.current.sorting).toEqual({
      sort: {
        field: 'lastUpdate',
        direction: 'desc',
      },
    });
  });

  it('clears selected templates when query params change', () => {
    const { result } = renderHook(() => useTemplatesState(), { wrapper });

    const mockTemplate: Template = {
      key: 'template-1',
      name: 'Template 1',
      description: 'Description',
      solution: 'security',
      fields: 5,
      tags: ['tag1'],
      lastUpdate: '2024-01-01T00:00:00.000Z',
      lastTimeUsed: '2024-01-01T00:00:00.000Z',
      usage: 10,
      isDefault: false,
    };

    // Simulate selecting a template via the selection callback
    act(() => {
      result.current.selection.onSelectionChange([mockTemplate]);
    });

    expect(result.current.selectedTemplates).toEqual([mockTemplate]);

    // Now change query params
    act(() => {
      result.current.setQueryParams({ page: 2 });
    });

    expect(result.current.selectedTemplates).toEqual([]);
  });

  it('deselects templates correctly', () => {
    const { result } = renderHook(() => useTemplatesState(), { wrapper });

    const mockTemplate: Template = {
      key: 'template-1',
      name: 'Template 1',
      description: 'Description',
      solution: 'security',
      fields: 5,
      tags: ['tag1'],
      lastUpdate: '2024-01-01T00:00:00.000Z',
      lastTimeUsed: '2024-01-01T00:00:00.000Z',
      usage: 10,
      isDefault: false,
    };

    act(() => {
      result.current.selection.onSelectionChange([mockTemplate]);
    });

    expect(result.current.selectedTemplates).toEqual([mockTemplate]);

    act(() => {
      result.current.deselectTemplates();
    });

    expect(result.current.selectedTemplates).toEqual([]);
  });

  it('preserves other query params when updating one', () => {
    const { result } = renderHook(() => useTemplatesState(), { wrapper });

    act(() => {
      result.current.setQueryParams({ search: 'test' });
    });

    act(() => {
      result.current.setQueryParams({ page: 2 });
    });

    expect(result.current.queryParams).toEqual({
      page: 2,
      perPage: 10,
      sortField: 'name',
      sortOrder: 'asc',
      search: 'test',
    });
  });
});
