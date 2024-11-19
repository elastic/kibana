/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTableColumn } from '@elastic/eui';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../mock/test_providers/test_providers';
import { ContextEditorRow } from '../types';
import { getColumns } from '.';

interface ColumnWithRender {
  render: (_: unknown, row: ContextEditorRow) => React.ReactNode;
}

const fieldIsNotAllowed: ContextEditorRow = {
  allowed: false, // the field is not allowed
  anonymized: false,
  denied: false,
  field: 'event.category',
  rawValues: ['authentication'],
};

const fieldIsAllowedButNotAnonymized: ContextEditorRow = {
  allowed: true, // the field is allowed
  anonymized: false,
  denied: false,
  field: 'event.category',
  rawValues: ['authentication'],
};

const rowWhereFieldIsAnonymized: ContextEditorRow = {
  allowed: true,
  anonymized: true, // the field is anonymized
  denied: false,
  field: 'user.name',
  rawValues: ['rawUsername'],
};

describe('getColumns', () => {
  const onListUpdated = jest.fn();
  const rawData: Record<string, string[]> = {
    'field.name': ['value1', 'value2'],
  };
  const hasUpdateAIAssistantAnonymization = true;

  const row: ContextEditorRow = {
    allowed: true,
    anonymized: false,
    denied: false,
    field: 'event.category',
    rawValues: ['authentication'],
  };

  it('includes the values column when rawData is NOT null', () => {
    const columns: Array<EuiBasicTableColumn<ContextEditorRow> & { field?: string }> = getColumns({
      onListUpdated,
      rawData,
      hasUpdateAIAssistantAnonymization,
    });

    expect(columns.some(({ field }) => field === 'rawValues')).toBe(true);
  });

  it('does NOT include the values column when rawData is null', () => {
    const columns: Array<EuiBasicTableColumn<ContextEditorRow> & { field?: string }> = getColumns({
      onListUpdated,
      rawData: null,
      hasUpdateAIAssistantAnonymization,
    });

    expect(columns.some(({ field }) => field === 'rawValues')).toBe(false);
  });

  describe('allowed column render()', () => {
    it('calls onListUpdated with a `remove` operation when the toggle is clicked on field that is allowed', () => {
      const columns = getColumns({ onListUpdated, rawData, hasUpdateAIAssistantAnonymization });
      const anonymizedColumn: ColumnWithRender = columns[0] as ColumnWithRender;
      const allowedRow = {
        ...row,
        allowed: true, // the field is allowed
      };

      const { getByTestId } = render(
        <TestProviders>
          <>{anonymizedColumn.render(undefined, allowedRow)}</>
        </TestProviders>
      );

      fireEvent.click(getByTestId('allowed'));

      expect(onListUpdated).toBeCalledWith([
        { field: 'event.category', operation: 'remove', update: 'allow' },
      ]);
    });

    it('calls onListUpdated with an `add` operation when the toggle is clicked on a field that is NOT allowed', () => {
      const columns = getColumns({ onListUpdated, rawData, hasUpdateAIAssistantAnonymization });
      const anonymizedColumn: ColumnWithRender = columns[0] as ColumnWithRender;
      const notAllowedRow = {
        ...row,
        allowed: false, // the field is NOT allowed
      };

      const { getByTestId } = render(
        <TestProviders>
          <>{anonymizedColumn.render(undefined, notAllowedRow)}</>
        </TestProviders>
      );

      fireEvent.click(getByTestId('allowed'));

      expect(onListUpdated).toBeCalledWith([
        { field: 'event.category', operation: 'add', update: 'allow' },
      ]);
    });

    it('calls onListUpdated with a `remove` operation to update the `defaultAllowReplacement` list when the toggle is clicked on a default field that is allowed', () => {
      const columns = getColumns({
        onListUpdated,
        rawData: null,
        hasUpdateAIAssistantAnonymization,
      }); // null raw data means the field is a default field
      const anonymizedColumn: ColumnWithRender = columns[0] as ColumnWithRender;
      const allowedRow = {
        ...row,
        allowed: true, // the field is allowed
      };

      const { getByTestId } = render(
        <TestProviders>
          <>{anonymizedColumn.render(undefined, allowedRow)}</>
        </TestProviders>
      );

      fireEvent.click(getByTestId('allowed'));

      expect(onListUpdated).toBeCalledWith([
        { field: 'event.category', operation: 'remove', update: 'allow' },
      ]);
    });
  });

  describe('anonymized column render()', () => {
    it('disables the button when the field is not allowed', () => {
      const columns = getColumns({ onListUpdated, rawData, hasUpdateAIAssistantAnonymization });
      const anonymizedColumn: ColumnWithRender = columns[1] as ColumnWithRender;

      const { getByTestId } = render(
        <TestProviders>
          <>{anonymizedColumn.render(undefined, fieldIsNotAllowed)}</>
        </TestProviders>
      );

      expect(getByTestId('anonymized')).toBeDisabled();
    });

    it('enables the button when the field is allowed', () => {
      const columns = getColumns({ onListUpdated, rawData, hasUpdateAIAssistantAnonymization });
      const anonymizedColumn: ColumnWithRender = columns[1] as ColumnWithRender;

      const { getByTestId } = render(
        <TestProviders>
          <>{anonymizedColumn.render(undefined, fieldIsAllowedButNotAnonymized)}</>
        </TestProviders>
      );

      expect(getByTestId('anonymized')).not.toBeDisabled();
    });

    it('calls onListUpdated with an `add` operation when an unanonymized field is toggled', () => {
      const columns = getColumns({ onListUpdated, rawData, hasUpdateAIAssistantAnonymization });
      const anonymizedColumn: ColumnWithRender = columns[1] as ColumnWithRender;

      const { getByTestId } = render(
        <TestProviders>
          <>{anonymizedColumn.render(undefined, row)}</>
        </TestProviders>
      );

      fireEvent.click(getByTestId('anonymized'));

      expect(onListUpdated).toBeCalledWith([
        { field: 'event.category', operation: 'add', update: 'allowReplacement' },
      ]);
    });

    it('calls onListUpdated with a `remove` operation when an anonymized field is toggled', () => {
      const columns = getColumns({ onListUpdated, rawData, hasUpdateAIAssistantAnonymization });
      const anonymizedColumn: ColumnWithRender = columns[1] as ColumnWithRender;

      const anonymizedRow = {
        ...row,
        anonymized: true,
      };

      const { getByTestId } = render(
        <TestProviders>
          <>{anonymizedColumn.render(undefined, anonymizedRow)}</>
        </TestProviders>
      );

      fireEvent.click(getByTestId('anonymized'));

      expect(onListUpdated).toBeCalledWith([
        { field: 'event.category', operation: 'remove', update: 'allowReplacement' },
      ]);
    });

    it('calls onListUpdated with an update to the `defaultAllowReplacement` list when rawData is null, because the field is a default', () => {
      const columns = getColumns({
        onListUpdated,
        rawData: null,
        hasUpdateAIAssistantAnonymization,
      }); // null raw data means the field is a default field
      const anonymizedColumn: ColumnWithRender = columns[1] as ColumnWithRender;

      const { getByTestId } = render(
        <TestProviders>
          <>{anonymizedColumn.render(undefined, row)}</>
        </TestProviders>
      );

      fireEvent.click(getByTestId('anonymized'));

      expect(onListUpdated).toBeCalledWith([
        { field: 'event.category', operation: 'add', update: 'allowReplacement' },
      ]);
    });

    it('displays a closed eye icon when the field is anonymized', () => {
      const columns = getColumns({ onListUpdated, rawData, hasUpdateAIAssistantAnonymization });
      const anonymizedColumn: ColumnWithRender = columns[1] as ColumnWithRender;

      const { container } = render(
        <TestProviders>
          <>{anonymizedColumn.render(undefined, rowWhereFieldIsAnonymized)}</>
        </TestProviders>
      );

      expect(container.querySelector('[data-euiicon-type="eyeClosed"]')).not.toBeNull();
      expect(container.querySelector('[data-euiicon-type="eye"]')).toBeNull();
    });

    it('displays a open eye icon when the field is NOT anonymized', () => {
      const columns = getColumns({ onListUpdated, rawData, hasUpdateAIAssistantAnonymization });
      const anonymizedColumn: ColumnWithRender = columns[1] as ColumnWithRender;

      const { container } = render(
        <TestProviders>
          <>{anonymizedColumn.render(undefined, fieldIsAllowedButNotAnonymized)}</>
        </TestProviders>
      );

      expect(container.querySelector('[data-euiicon-type="eyeClosed"]')).toBeNull();
      expect(container.querySelector('[data-euiicon-type="eye"]')).not.toBeNull();
    });

    it('displays Yes when the field is anonymized', () => {
      const columns = getColumns({ onListUpdated, rawData, hasUpdateAIAssistantAnonymization });
      const anonymizedColumn: ColumnWithRender = columns[1] as ColumnWithRender;

      const { getByTestId } = render(
        <TestProviders>
          <>{anonymizedColumn.render(undefined, rowWhereFieldIsAnonymized)}</>
        </TestProviders>
      );

      expect(getByTestId('anonymized')).toHaveTextContent('Yes');
    });

    it('displays No when the field is NOT anonymized', () => {
      const columns = getColumns({ onListUpdated, rawData, hasUpdateAIAssistantAnonymization });
      const anonymizedColumn: ColumnWithRender = columns[1] as ColumnWithRender;

      const { getByTestId } = render(
        <TestProviders>
          <>{anonymizedColumn.render(undefined, fieldIsAllowedButNotAnonymized)}</>
        </TestProviders>
      );

      expect(getByTestId('anonymized')).toHaveTextContent('No');
    });
  });

  describe('values column render()', () => {
    it('joins values with a comma', () => {
      const columns = getColumns({ onListUpdated, rawData, hasUpdateAIAssistantAnonymization });
      const valuesColumn: ColumnWithRender = columns[3] as ColumnWithRender;

      const rowWithMultipleValues = {
        ...row,
        field: 'user.name',
        rawValues: ['abe', 'bart'],
      };

      render(
        <TestProviders>
          <>{valuesColumn.render(rowWithMultipleValues.rawValues, rowWithMultipleValues)}</>
        </TestProviders>
      );

      expect(screen.getByTestId('rawValues')).toHaveTextContent('abe,bart');
    });
  });

  describe('actions column render()', () => {
    it('renders the bulk actions', () => {
      const columns = getColumns({ onListUpdated, rawData, hasUpdateAIAssistantAnonymization });
      const actionsColumn: ColumnWithRender = columns[4] as ColumnWithRender;

      render(
        <TestProviders>
          <>{actionsColumn.render(null, row)}</>
        </TestProviders>
      );

      expect(screen.getByTestId('bulkActions')).toBeInTheDocument();
    });
  });
});
