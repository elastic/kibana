/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, renderHook, screen } from '@testing-library/react';
import type { EuiTableFieldDataColumnType } from '@elastic/eui';

import { TestProviders } from '../../../common/mock';
import type { TemplateListItem } from '../../../../common/types/api/template/v1';
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

    // Expected columns: name, description, fieldCount, tags, author, lastUsedAt, usageCount, actions
    expect(result.current.columns.length).toBeGreaterThanOrEqual(8);
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

  it('includes fieldCount column', () => {
    const { result } = renderHook(() => useTemplatesColumns(defaultProps), { wrapper });

    const fieldCountColumn = result.current.columns.find(
      (col) => 'field' in col && col.field === 'fieldCount'
    );
    expect(fieldCountColumn).toBeDefined();
    expect(fieldCountColumn).toHaveProperty('sortable', true);
  });

  it('includes author column', () => {
    const { result } = renderHook(() => useTemplatesColumns(defaultProps), { wrapper });

    const authorColumn = result.current.columns.find(
      (col) => 'field' in col && col.field === 'author'
    );
    expect(authorColumn).toBeDefined();
    expect(authorColumn).toHaveProperty('sortable', true);
  });

  it('includes tags column', () => {
    const { result } = renderHook(() => useTemplatesColumns(defaultProps), { wrapper });

    const tagsColumn = result.current.columns.find((col) => 'field' in col && col.field === 'tags');
    expect(tagsColumn).toBeDefined();
    expect(tagsColumn).toHaveProperty('sortable', false);
  });

  it('includes lastUsedAt column', () => {
    const { result } = renderHook(() => useTemplatesColumns(defaultProps), { wrapper });

    const lastUsedAtColumn = result.current.columns.find(
      (col) => 'field' in col && col.field === 'lastUsedAt'
    );
    expect(lastUsedAtColumn).toBeDefined();
    expect(lastUsedAtColumn).toHaveProperty('sortable', true);
  });

  it('includes usageCount column', () => {
    const { result } = renderHook(() => useTemplatesColumns(defaultProps), { wrapper });

    const usageCountColumn = result.current.columns.find(
      (col) => 'field' in col && col.field === 'usageCount'
    );
    expect(usageCountColumn).toBeDefined();
    expect(usageCountColumn).toHaveProperty('sortable', true);
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

  describe('fieldCount column render', () => {
    const getFieldCountColumn = () => {
      const { result } = renderHook(() => useTemplatesColumns(defaultProps), { wrapper });
      return result.current.columns.find(
        (col) => 'field' in col && col.field === 'fieldCount'
      ) as EuiTableFieldDataColumnType<TemplateListItem>;
    };

    const baseTemplate: TemplateListItem = {
      templateId: 't-1',
      name: 'Test',
      owner: 'securitySolution',
      definition: '',
      templateVersion: 1,
      deletedAt: null,
      author: 'test-user',
      fieldSearchMatches: false,
    };

    it('shows beacon when fieldSearchMatches is true', () => {
      const column = getFieldCountColumn();
      const template = { ...baseTemplate, fieldCount: 3, fieldSearchMatches: true };
      render(<>{column.render!(3, template)}</>);

      expect(screen.getByTestId('template-column-fields-search-match')).toBeInTheDocument();
    });

    it('does not show beacon when fieldSearchMatches is false', () => {
      const column = getFieldCountColumn();
      const template = { ...baseTemplate, fieldCount: 3, fieldSearchMatches: false };
      render(<>{column.render!(3, template)}</>);

      expect(screen.queryByTestId('template-column-fields-search-match')).not.toBeInTheDocument();
    });

    it('shows the field count number', () => {
      const column = getFieldCountColumn();
      const template = { ...baseTemplate, fieldCount: 5 };
      render(<>{column.render!(5, template)}</>);

      expect(screen.getByTestId('template-column-fields')).toHaveTextContent('5');
    });

    it('shows beacon alongside tooltip when fieldNames are present', () => {
      const column = getFieldCountColumn();
      const template = {
        ...baseTemplate,
        fieldCount: 2,
        fieldNames: ['severity', 'hostname'],
        fieldSearchMatches: true,
      };
      render(<>{column.render!(2, template)}</>);

      expect(screen.getByTestId('template-column-fields-search-match')).toBeInTheDocument();
      expect(screen.getByTestId('template-column-fields')).toHaveTextContent('2');
    });
  });
});
