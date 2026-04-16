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
    renderWithTestingProviders(<ExtendedFieldsColumnCell extendedFields={undefined} />);
    expect(screen.getByText('\u2014')).toBeInTheDocument();
  });

  it('renders empty cell when extended fields object is empty', () => {
    renderWithTestingProviders(<ExtendedFieldsColumnCell extendedFields={{}} />);
    expect(screen.getByText('\u2014')).toBeInTheDocument();
  });

  it('renders a single label without ellipsis', () => {
    renderWithTestingProviders(
      <ExtendedFieldsColumnCell extendedFields={{ summaryAsKeyword: 'value' }} />
    );
    expect(screen.getByTestId('case-table-column-extended-fields')).toHaveTextContent('Summary');
  });

  it('renders two labels joined with comma without ellipsis', () => {
    renderWithTestingProviders(
      <ExtendedFieldsColumnCell extendedFields={{ summaryAsKeyword: 'a', effortAsInteger: '1' }} />
    );
    expect(screen.getByTestId('case-table-column-extended-fields')).toHaveTextContent(
      'Effort, Summary'
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
      />
    );
    expect(screen.getByTestId('case-table-column-extended-fields')).toHaveTextContent(
      'Effort, Notes…'
    );
  });
});
