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
import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';
import { useCaseConfigureResponse } from '../configure_cases/__mock__';

jest.mock('../../containers/configure/use_get_case_configuration');
jest.mock('../case_view/components/sidebar/sidebar_toggle_button', () => ({
  SidebarToggleButton: () => <div data-test-subj="case-view-sidebar-toggle" />,
}));

const useGetCaseConfigurationMock = useGetCaseConfiguration as jest.Mock;

const defaultSelectedColumns = [
  { field: 'title', name: 'Name', isChecked: true },
  { field: 'createdAt', name: 'Created on', isChecked: true },
  { field: 'tags', name: 'Tags', isChecked: true },
  { field: 'category', name: 'Category', isChecked: true },
  { field: 'status', name: 'Status', isChecked: true },
  { field: 'severity', name: 'Severity', isChecked: true },
];

describe('SimilarCasesTable', () => {
  const props: SimilarCasesTableProps = {
    cases: [
      {
        ...mockCase,
        similarities: { observables: mockSimilarObservables },
        createdAt: '2023-01-01T00:00:00.000Z',
      },
    ],
    isLoading: false,
    onChange: jest.fn(),
    pagination: { pageIndex: 0, totalItemCount: 1 },
    selectedColumns: defaultSelectedColumns,
    onSelectedColumnsChange: jest.fn(),
  };

  beforeEach(() => {
    useGetCaseConfigurationMock.mockReturnValue(useCaseConfigureResponse);
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

  it('renders the createdAt column when selected', async () => {
    renderWithTestingProviders(<SimilarCasesTable {...props} />);

    expect(await screen.findByTestId('similar-cases-table-column-createdAt')).toBeInTheDocument();
  });

  it('renders the columns popover button', async () => {
    renderWithTestingProviders(<SimilarCasesTable {...props} />);

    expect(screen.getByTestId('column-selection-popover-button')).toBeInTheDocument();
  });

  it('renders the sidebar toggle button', async () => {
    renderWithTestingProviders(<SimilarCasesTable {...props} />);

    expect(screen.getByTestId('case-view-sidebar-toggle')).toBeInTheDocument();
  });

  it('renders loading indicator when loading', async () => {
    renderWithTestingProviders(<SimilarCasesTable {...props} isLoading={true} />);
    expect(screen.queryByTestId('similar-cases-table')).not.toBeInTheDocument();
    expect(screen.getByTestId('similar-cases-table-loading')).toBeInTheDocument();
  });
});
