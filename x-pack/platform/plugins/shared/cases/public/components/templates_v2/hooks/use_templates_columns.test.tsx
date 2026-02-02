/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';

import { TestProviders } from '../../../common/mock';
import { useTemplatesColumns } from './use_templates_columns';

describe('useTemplatesColumns', () => {
  const wrapper = ({ children }: React.PropsWithChildren<{}>) => (
    <TestProviders>{children}</TestProviders>
  );

  const defaultProps = {
    onEdit: jest.fn(),
    onClone: jest.fn(),
    onSetAsDefault: jest.fn(),
    onExport: jest.fn(),
    onDelete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns columns array', () => {
    const { result } = renderHook(() => useTemplatesColumns(defaultProps), { wrapper });

    expect(result.current.columns).toBeDefined();
    expect(Array.isArray(result.current.columns)).toBe(true);
  });

  it('returns expected number of columns', () => {
    const { result } = renderHook(() => useTemplatesColumns(defaultProps), { wrapper });

    // Expected columns: name, description, solution, fields, tags, lastUpdate, lastTimeUsed, usage, actions
    expect(result.current.columns.length).toBeGreaterThanOrEqual(9);
  });

  it('includes name column', () => {
    const { result } = renderHook(() => useTemplatesColumns(defaultProps), { wrapper });

    const nameColumn = result.current.columns.find((col) => 'field' in col && col.field === 'name');
    expect(nameColumn).toBeDefined();
    expect(nameColumn).toHaveProperty('sortable', true);
  });

  it('includes description column', () => {
    const { result } = renderHook(() => useTemplatesColumns(defaultProps), { wrapper });

    const descriptionColumn = result.current.columns.find(
      (col) => 'field' in col && col.field === 'description'
    );
    expect(descriptionColumn).toBeDefined();
    expect(descriptionColumn).toHaveProperty('sortable', false);
  });

  it('includes solution column', () => {
    const { result } = renderHook(() => useTemplatesColumns(defaultProps), { wrapper });

    const solutionColumn = result.current.columns.find(
      (col) => 'field' in col && col.field === 'solution'
    );
    expect(solutionColumn).toBeDefined();
    expect(solutionColumn).toHaveProperty('sortable', true);
  });

  it('includes fields column', () => {
    const { result } = renderHook(() => useTemplatesColumns(defaultProps), { wrapper });

    const fieldsColumn = result.current.columns.find(
      (col) => 'field' in col && col.field === 'fields'
    );
    expect(fieldsColumn).toBeDefined();
    expect(fieldsColumn).toHaveProperty('sortable', true);
  });

  it('includes tags column', () => {
    const { result } = renderHook(() => useTemplatesColumns(defaultProps), { wrapper });

    const tagsColumn = result.current.columns.find((col) => 'field' in col && col.field === 'tags');
    expect(tagsColumn).toBeDefined();
    expect(tagsColumn).toHaveProperty('sortable', false);
  });

  it('includes lastUpdate column', () => {
    const { result } = renderHook(() => useTemplatesColumns(defaultProps), { wrapper });

    const lastUpdateColumn = result.current.columns.find(
      (col) => 'field' in col && col.field === 'lastUpdate'
    );
    expect(lastUpdateColumn).toBeDefined();
    expect(lastUpdateColumn).toHaveProperty('sortable', true);
  });

  it('includes lastTimeUsed column', () => {
    const { result } = renderHook(() => useTemplatesColumns(defaultProps), { wrapper });

    const lastTimeUsedColumn = result.current.columns.find(
      (col) => 'field' in col && col.field === 'lastTimeUsed'
    );
    expect(lastTimeUsedColumn).toBeDefined();
    expect(lastTimeUsedColumn).toHaveProperty('sortable', true);
  });

  it('includes usage column', () => {
    const { result } = renderHook(() => useTemplatesColumns(defaultProps), { wrapper });

    const usageColumn = result.current.columns.find(
      (col) => 'field' in col && col.field === 'usage'
    );
    expect(usageColumn).toBeDefined();
    expect(usageColumn).toHaveProperty('sortable', true);
  });

  it('includes actions column', () => {
    const { result } = renderHook(() => useTemplatesColumns(defaultProps), { wrapper });

    // The actions column is a computed column with a render function and name 'Actions'
    const actionsColumn = result.current.columns.find(
      (col) => 'name' in col && col.name === 'Actions' && 'render' in col && !('field' in col)
    );
    expect(actionsColumn).toBeDefined();
  });

  it('columns are stable between renders', () => {
    const { result, rerender } = renderHook(() => useTemplatesColumns(defaultProps), {
      wrapper,
    });

    const firstRenderColumns = result.current.columns;

    rerender();

    expect(result.current.columns).toBe(firstRenderColumns);
  });

  it('columns update when props change', () => {
    const { result, rerender } = renderHook((props) => useTemplatesColumns(props), {
      wrapper,
      initialProps: defaultProps,
    });

    const firstRenderColumns = result.current.columns;

    const newProps = {
      ...defaultProps,
      onEdit: jest.fn(),
    };

    rerender(newProps);

    // Columns should be recalculated when callbacks change
    expect(result.current.columns).not.toBe(firstRenderColumns);
  });
});
