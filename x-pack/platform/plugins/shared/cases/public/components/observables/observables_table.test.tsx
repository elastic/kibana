/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { type AppMockRenderer, createAppMockRenderer } from '../../common/mock';
import { mockCase, mockObservables } from '../../containers/mock';
import { ObservablesTable, type ObservablesTableProps } from './observables_table';

describe('ObservablesTable', () => {
  let appMock: AppMockRenderer;
  const props: ObservablesTableProps = {
    caseData: {
      ...mockCase,
      observables: mockObservables,
    },
    isLoading: false,
  };

  beforeEach(() => {
    appMock = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    const result = appMock.render(<ObservablesTable {...props} />);

    expect(result.getByTestId('cases-observables-table')).toBeInTheDocument();

    expect(result.getByText('Showing 2 observables')).toBeInTheDocument();
    expect(result.getByText('Observable type')).toBeInTheDocument();
    expect(result.getByText('Observable value')).toBeInTheDocument();
  });

  it('renders loading indicator when loading', async () => {
    const result = appMock.render(<ObservablesTable {...props} isLoading={true} />);
    expect(result.queryByTestId('cases-observables-table')).not.toBeInTheDocument();
    expect(result.getByTestId('cases-observables-table-loading')).toBeInTheDocument();
  });
});
