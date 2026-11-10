/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTable } from '@elastic/eui';
import { render, screen, within } from '@testing-library/react';
import React from 'react';

import type { ContextEditorRow } from '../types';
import { getSelectionColumns } from './get_selection_columns';

const rows: ContextEditorRow[] = [
  {
    allowed: true,
    anonymized: false,
    denied: false,
    field: 'user.name',
    rawValues: [],
  },
  {
    allowed: true,
    anonymized: true,
    denied: false,
    field: 'host.name',
    rawValues: [],
  },
];

const anonymizationPageFields = rows.map(({ field }, index) => ({
  id: `id-${index}`,
  field,
  allowed: true,
  anonymized: false,
}));

const defaultProps = {
  anonymizationPageFields,
  handlePageChecked: jest.fn(),
  handlePageReset: jest.fn(),
  handlePageUnchecked: jest.fn(),
  handleRowChecked: jest.fn(),
  handleRowReset: jest.fn(),
  handleRowUnChecked: jest.fn(),
  hasUpdateAIAssistantAnonymization: true,
  selectedFields: [],
  totalItemCount: rows.length,
};

describe('getSelectionColumns', () => {
  it('returns no columns when the user cannot update anonymization', () => {
    expect(
      getSelectionColumns({ ...defaultProps, hasUpdateAIAssistantAnonymization: false })
    ).toEqual([]);
  });

  it('renders a single checkbox per row in the mobile (responsive) layout', () => {
    render(
      <EuiBasicTable
        columns={getSelectionColumns(defaultProps)}
        itemId="field"
        items={rows}
        responsiveBreakpoint={true}
        tableCaption="Anonymization fields"
      />
    );

    const tableRows = screen.getAllByRole('row').filter((row) => row.closest('tbody') != null);

    expect(tableRows).toHaveLength(rows.length);
    tableRows.forEach((row) => {
      expect(within(row).getAllByRole('checkbox')).toHaveLength(1);
    });
    expect(screen.queryAllByTestId('checkboxSelectAll')).toHaveLength(1);
  });
});
