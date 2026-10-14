/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithTestingProviders } from '../../common/mock';
import { SimilarCasesTable, type SimilarCasesTableProps } from './table';
import { mockCase, mockSimilarObservables } from '../../containers/mock';
import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';
import { useBulkGetUserProfiles } from '../../containers/user_profiles/use_bulk_get_user_profiles';
import { userProfiles, userProfilesMap } from '../../containers/user_profiles/api.mock';
import { useCaseConfigureResponse } from '../configure_cases/__mock__';

jest.mock('../../containers/configure/use_get_case_configuration');
jest.mock('../../containers/user_profiles/use_bulk_get_user_profiles');
jest.mock('../case_view/components/sidebar/sidebar_toggle_button', () => ({
  SidebarToggleButton: () => <div data-test-subj="case-view-sidebar-toggle" />,
}));

const useGetCaseConfigurationMock = useGetCaseConfiguration as jest.Mock;
const useBulkGetUserProfilesMock = useBulkGetUserProfiles as jest.Mock;

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
    useBulkGetUserProfilesMock.mockReturnValue({ data: new Map() });
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

  it('does not offer the name column in the columns popover', async () => {
    renderWithTestingProviders(<SimilarCasesTable {...props} />);

    await userEvent.click(screen.getByTestId('column-selection-popover-button'));

    expect(await screen.findByTestId('column-selection-switch-createdAt')).toBeInTheDocument();
    expect(screen.queryByTestId('column-selection-switch-title')).not.toBeInTheDocument();
  });

  it('keeps the name column checked and first when columns change', async () => {
    const onSelectedColumnsChange = jest.fn();
    renderWithTestingProviders(
      <SimilarCasesTable {...props} onSelectedColumnsChange={onSelectedColumnsChange} />
    );

    await userEvent.click(screen.getByTestId('column-selection-popover-button'));
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    await user.click(await screen.findByTestId('column-selection-popover-hide-all-button'));

    await waitFor(() => expect(onSelectedColumnsChange).toHaveBeenCalled());
    const [newColumns] = onSelectedColumnsChange.mock.calls[0];
    expect(newColumns[0]).toEqual(expect.objectContaining({ field: 'title', isChecked: true }));
    expect(newColumns.slice(1).every(({ isChecked }: { isChecked: boolean }) => !isChecked)).toBe(
      true
    );
  });

  it('shows the name column even when the stored selection hides it', async () => {
    renderWithTestingProviders(
      <SimilarCasesTable
        {...props}
        selectedColumns={defaultSelectedColumns.map((column) =>
          column.field === 'title' ? { ...column, isChecked: false } : column
        )}
      />
    );

    expect(await screen.findByText(mockCase.title)).toBeInTheDocument();
  });

  describe('assignees', () => {
    const [firstProfile, secondProfile] = userProfiles;
    const selectedColumnsWithAssignees = [
      ...defaultSelectedColumns,
      { field: 'assignees', name: 'Assignees', isChecked: true },
    ];
    const casesWithAssignees = [
      {
        ...props.cases[0],
        id: 'case-with-two-assignees',
        assignees: [{ uid: firstProfile.uid }, { uid: secondProfile.uid }],
      },
      {
        ...props.cases[0],
        id: 'case-with-shared-assignee',
        assignees: [{ uid: firstProfile.uid }],
      },
    ];

    it('requests the profiles of all assignees once, without duplicates', () => {
      renderWithTestingProviders(
        <SimilarCasesTable
          {...props}
          cases={casesWithAssignees}
          selectedColumns={selectedColumnsWithAssignees}
        />
      );

      expect(useBulkGetUserProfilesMock).toHaveBeenLastCalledWith({
        uids: [firstProfile.uid, secondProfile.uid],
      });
    });

    it('renders each assignee with the fetched profile', async () => {
      useBulkGetUserProfilesMock.mockReturnValue({ data: userProfilesMap });

      renderWithTestingProviders(
        <SimilarCasesTable
          {...props}
          cases={casesWithAssignees}
          selectedColumns={selectedColumnsWithAssignees}
        />
      );

      expect(
        await screen.findAllByTestId(`case-table-column-assignee-${firstProfile.user.username}`)
      ).toHaveLength(2);
      expect(
        screen.getAllByTestId(`case-table-column-assignee-${secondProfile.user.username}`)
      ).toHaveLength(1);
    });

    it('renders an assignee without a profile by uid', async () => {
      renderWithTestingProviders(
        <SimilarCasesTable
          {...props}
          cases={casesWithAssignees}
          selectedColumns={selectedColumnsWithAssignees}
        />
      );

      expect(
        await screen.findAllByTestId(`case-table-column-assignee-${firstProfile.uid}`)
      ).toHaveLength(2);
      expect(
        screen.queryByTestId(`case-table-column-assignee-${firstProfile.user.username}`)
      ).not.toBeInTheDocument();
    });

    it('does not render the assignees column when it is not selected', () => {
      renderWithTestingProviders(<SimilarCasesTable {...props} cases={casesWithAssignees} />);

      expect(screen.queryByTestId('case-table-column-assignee')).not.toBeInTheDocument();
    });
  });

  it('renders loading indicator when loading', async () => {
    renderWithTestingProviders(<SimilarCasesTable {...props} isLoading={true} />);
    expect(screen.queryByTestId('similar-cases-table')).not.toBeInTheDocument();
    expect(screen.getByTestId('similar-cases-table-loading')).toBeInTheDocument();
  });
});
