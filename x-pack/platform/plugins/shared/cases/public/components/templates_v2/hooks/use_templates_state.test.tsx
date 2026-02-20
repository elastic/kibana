/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import type { TemplateListItem } from '../../../../common/types/api/template/v1';
import { TestProviders } from '../../../common/mock';
import { useTemplatesState } from './use_templates_state';

describe('useTemplatesState', () => {
  const wrapper = ({ children }: React.PropsWithChildren<{}>) => (
    <TestProviders>{children}</TestProviders>
  );

  beforeEach(() => {
    localStorage.clear();
  });

  it('returns default query params', () => {
    const { result } = renderHook(() => useTemplatesState(), { wrapper });

    expect(result.current.queryParams).toEqual({
      page: 1,
      perPage: 10,
      sortField: 'name',
      sortOrder: 'asc',
      search: '',
      tags: [],
      author: [],
      isDeleted: false,
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
      tags: [],
      author: [],
      isDeleted: false,
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
      result.current.setQueryParams({ sortField: 'lastUsedAt', sortOrder: 'desc' });
    });

    expect(result.current.queryParams.sortField).toBe('lastUsedAt');
    expect(result.current.queryParams.sortOrder).toBe('desc');
    expect(result.current.sorting).toEqual({
      sort: {
        field: 'lastUsedAt',
        direction: 'desc',
      },
    });
  });

  it('clears selected templates when query params change', () => {
    const { result } = renderHook(() => useTemplatesState(), { wrapper });

    const mockTemplate: TemplateListItem = {
      templateId: 'template-1',
      name: 'Template 1',
      owner: 'securitySolution',
      definition: 'fields:\n  - name: field1\n    type: keyword',
      templateVersion: 1,
      deletedAt: null,
      description: 'Description',
      fieldCount: 5,
      tags: ['tag1'],
      author: 'user1',
      lastUsedAt: '2024-01-01T00:00:00.000Z',
      usageCount: 10,
      isDefault: false,
      fieldSearchMatches: false,
    };

    // Simulate selecting a template via the selection callback
    act(() => {
      result.current.selection.onSelectionChange?.([mockTemplate]);
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

    const mockTemplate: TemplateListItem = {
      templateId: 'template-1',
      name: 'Template 1',
      owner: 'securitySolution',
      definition: 'fields:\n  - name: field1\n    type: keyword',
      templateVersion: 1,
      deletedAt: null,
      description: 'Description',
      fieldCount: 5,
      tags: ['tag1'],
      author: 'user1',
      lastUsedAt: '2024-01-01T00:00:00.000Z',
      usageCount: 10,
      isDefault: false,
      fieldSearchMatches: false,
    };

    act(() => {
      result.current.selection.onSelectionChange?.([mockTemplate]);
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
      tags: [],
      author: [],
      isDeleted: false,
    });
  });
});
