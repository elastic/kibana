/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { renderWithTestingProviders } from '../../common/mock';
import { ExtendedFieldsColumnCell } from './extended_fields_column_cell';

describe('ExtendedFieldsColumnCell', () => {
  it('renders empty cell when there are no extended fields', () => {
    renderWithTestingProviders(
      <ExtendedFieldsColumnCell extendedFields={undefined} extendedFieldsLabels={undefined} />
    );
    expect(screen.getByText('\u2014')).toBeInTheDocument();
  });

  it('renders empty cell when extended fields object is empty', () => {
    renderWithTestingProviders(
      <ExtendedFieldsColumnCell extendedFields={{}} extendedFieldsLabels={undefined} />
    );
    expect(screen.getByText('\u2014')).toBeInTheDocument();
  });

  describe('without server-side labels (fallback to key-derived labels)', () => {
    it('renders a single label without ellipsis', () => {
      renderWithTestingProviders(
        <ExtendedFieldsColumnCell
          extendedFields={{ summaryAsKeyword: 'value' }}
          extendedFieldsLabels={undefined}
        />
      );
      expect(screen.getByTestId('case-table-column-extended-fields')).toHaveTextContent('Summary');
    });

    it('renders two labels in insertion order without ellipsis', () => {
      renderWithTestingProviders(
        <ExtendedFieldsColumnCell
          extendedFields={{ summaryAsKeyword: 'a', effortAsInteger: '1' }}
          extendedFieldsLabels={undefined}
        />
      );
      expect(screen.getByTestId('case-table-column-extended-fields')).toHaveTextContent(
        'Summary, Effort'
      );
    });

    it('truncates to two labels and ellipsis when more than two fields', () => {
      renderWithTestingProviders(
        <ExtendedFieldsColumnCell
          extendedFields={{
            summaryAsKeyword: 'a',
            effortAsInteger: '1',
            notesAsKeyword: 'b',
          }}
          extendedFieldsLabels={undefined}
        />
      );
      expect(screen.getByTestId('case-table-column-extended-fields')).toHaveTextContent(
        'Summary, Effort…'
      );
    });
  });

  describe('with server-side labels', () => {
    it('uses server-provided labels instead of key-derived ones', () => {
      renderWithTestingProviders(
        <ExtendedFieldsColumnCell
          extendedFields={{ priority_as_keyword: 'high', effort_as_integer: '3' }}
          extendedFieldsLabels={{
            priority_as_keyword: 'Priority Level',
            effort_as_integer: 'Effort Points',
          }}
        />
      );
      expect(screen.getByTestId('case-table-column-extended-fields')).toHaveTextContent(
        'Priority Level, Effort Points'
      );
    });

    it('preserves template field order from extendedFields insertion order', () => {
      renderWithTestingProviders(
        <ExtendedFieldsColumnCell
          extendedFields={{
            effort_as_integer: '3',
            priority_as_keyword: 'high',
            notes_as_keyword: 'text',
          }}
          extendedFieldsLabels={{
            effort_as_integer: 'Effort Points',
            priority_as_keyword: 'Priority Level',
            notes_as_keyword: 'Notes',
          }}
        />
      );
      expect(screen.getByTestId('case-table-column-extended-fields')).toHaveTextContent(
        'Effort Points, Priority Level…'
      );
    });

    it('falls back to key-derived label for keys missing from the labels map', () => {
      renderWithTestingProviders(
        <ExtendedFieldsColumnCell
          extendedFields={{ priority_as_keyword: 'high', effort_as_integer: '3' }}
          extendedFieldsLabels={{ priority_as_keyword: 'Priority Level' }}
        />
      );
      expect(screen.getByTestId('case-table-column-extended-fields')).toHaveTextContent(
        'Priority Level, Effort'
      );
    });
  });
});
