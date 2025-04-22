/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithTestingProviders } from '../../common/mock';
import { SimilarCasesTable, type SimilarCasesTableProps } from './table';
import { mockCase, mockSimilarObservables } from '../../containers/mock';

describe('SimilarCasesTable', () => {
  const props: SimilarCasesTableProps = {
    cases: [{ ...mockCase, similarities: { observables: mockSimilarObservables } }],
    isLoading: false,
    onChange: jest.fn(),
    pagination: { pageIndex: 0, totalItemCount: 1 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    renderWithTestingProviders(<SimilarCasesTable {...props} />);

    expect(screen.getByTestId('similar-cases-table')).toBeInTheDocument();
  });

  it('renders similarities correctly', async () => {
    renderWithTestingProviders(<SimilarCasesTable {...props} />);

    expect(await screen.findByTestId('similar-cases-table-column-similarities')).toBeTruthy();
  });

  it('renders loading indicator when loading', async () => {
    renderWithTestingProviders(<SimilarCasesTable {...props} isLoading={true} />);
    expect(screen.queryByTestId('similar-cases-table')).not.toBeInTheDocument();
    expect(screen.getByTestId('similar-cases-table-loading')).toBeInTheDocument();
  });
});
