/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { mockCase, mockObservables } from '../../containers/mock';
import { ObservablesTable, type ObservablesTableProps } from './observables_table';
import { renderWithTestingProviders } from '../../common/mock';

describe('ObservablesTable', () => {
  const props: ObservablesTableProps = {
    caseData: {
      ...mockCase,
      observables: mockObservables,
    },
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    renderWithTestingProviders(<ObservablesTable {...props} />);

    expect(screen.getByTestId('cases-observables-table')).toBeInTheDocument();

    expect(screen.getByText('Showing 2 observables')).toBeInTheDocument();
    expect(screen.getByText('Observable type')).toBeInTheDocument();
    expect(screen.getByText('Observable value')).toBeInTheDocument();
  });

  it('renders loading indicator when loading', async () => {
    renderWithTestingProviders(<ObservablesTable {...props} isLoading={true} />);
    expect(screen.queryByTestId('cases-observables-table')).not.toBeInTheDocument();
    expect(screen.getByTestId('cases-observables-table-loading')).toBeInTheDocument();
  });
});
