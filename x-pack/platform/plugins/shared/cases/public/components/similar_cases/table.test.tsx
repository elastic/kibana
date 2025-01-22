/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { type AppMockRenderer, createAppMockRenderer } from '../../common/mock';
import { SimilarCasesTable, type SimilarCasesTableProps } from './table';
import { mockCase, mockSimilarObservables } from '../../containers/mock';

describe('SimilarCasesTable', () => {
  let appMock: AppMockRenderer;
  const props: SimilarCasesTableProps = {
    cases: [{ ...mockCase, similarities: { observables: mockSimilarObservables } }],
    isLoading: false,
    onChange: jest.fn(),
    pagination: { pageIndex: 0, totalItemCount: 1 },
  };

  beforeEach(() => {
    appMock = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    const result = appMock.render(<SimilarCasesTable {...props} />);

    expect(result.getByTestId('similar-cases-table')).toBeInTheDocument();
  });

  it('renders similarities correctly', async () => {
    const result = appMock.render(<SimilarCasesTable {...props} />);

    expect(await result.findByTestId('similar-cases-table-column-similarities')).toBeTruthy();
  });

  it('renders loading indicator when loading', async () => {
    const result = appMock.render(<SimilarCasesTable {...props} isLoading={true} />);
    expect(result.queryByTestId('similar-cases-table')).not.toBeInTheDocument();
    expect(result.getByTestId('similar-cases-table-loading')).toBeInTheDocument();
  });
});
