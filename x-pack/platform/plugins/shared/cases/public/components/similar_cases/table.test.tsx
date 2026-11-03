/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithTestingProviders } from '../../common/mock';
import { SimilarCasesTable, type SimilarCasesTableProps } from './table';
import { mockCase, mockSimilarObservables } from '../../containers/mock';
import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';
import { useBulkGetUserProfiles } from '../../containers/user_profiles/use_bulk_get_user_profiles';
import { userProfiles, userProfilesMap } from '../../containers/user_profiles/api.mock';
import { useCaseConfigureResponse } from '../configure_cases/__mock__';
import { useGetSupportedActionConnectors } from '../../containers/configure/use_get_supported_action_connectors';
import { useGlobalInlineFields } from '../all_cases/hooks/use_global_inline_fields';
import { getExtendedFieldColumnKey } from '../all_cases/components/extended_field_columns';
import { useCasesConfig } from '../../common/lib/kibana';
import { FieldType } from '../../../common/types/domain/template/fields';
import type { InlineField } from '../../../common/types/domain/template/fields';

jest.mock('../../containers/configure/use_get_case_configuration');
jest.mock('../../containers/user_profiles/use_bulk_get_user_profiles');
jest.mock('../../containers/configure/use_get_supported_action_connectors');
jest.mock('../all_cases/hooks/use_global_inline_fields');
jest.mock('../../common/lib/kibana', () => ({
  ...jest.requireActual('../../common/lib/kibana'),
  useCasesConfig: jest.fn(),
}));

const useGetCaseConfigurationMock = useGetCaseConfiguration as jest.Mock;
const useBulkGetUserProfilesMock = useBulkGetUserProfiles as jest.Mock;
const useGetSupportedActionConnectorsMock = useGetSupportedActionConnectors as jest.Mock;
const useGlobalInlineFieldsMock = useGlobalInlineFields as jest.Mock;
const useCasesConfigMock = useCasesConfig as jest.Mock;

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
  };

  beforeEach(() => {
    useGetCaseConfigurationMock.mockReturnValue(useCaseConfigureResponse);
    useBulkGetUserProfilesMock.mockReturnValue({ data: new Map() });
    useGetSupportedActionConnectorsMock.mockReturnValue({ data: [] });
    useCasesConfigMock.mockReturnValue({ templatesEnabled: false });
    useGlobalInlineFieldsMock.mockReturnValue({
      globalInlineFields: [],
      isLoading: false,
      isLoaded: true,
    });
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

  it('shows the name column when it is selected', async () => {
    renderWithTestingProviders(<SimilarCasesTable {...props} />);

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

    it('does not request profiles when no avatar column is selected', () => {
      renderWithTestingProviders(<SimilarCasesTable {...props} cases={casesWithAssignees} />);

      expect(useBulkGetUserProfilesMock).toHaveBeenLastCalledWith({ uids: [] });
    });
  });

  describe('user-picker fields', () => {
    const [firstProfile, secondProfile] = userProfiles;
    const userField = {
      name: 'owner',
      type: 'keyword',
      label: 'Owner',
      control: FieldType.USER_PICKER,
    } as InlineField;
    const userKey = getExtendedFieldColumnKey(userField);
    const casesWithUserPicker = [
      {
        ...props.cases[0],
        extendedFields: {
          ownerAsKeyword: JSON.stringify([{ uid: secondProfile.uid, name: 'Second' }]),
        },
      },
    ];

    beforeEach(() => {
      useCasesConfigMock.mockReturnValue({ templatesEnabled: true });
      useGlobalInlineFieldsMock.mockReturnValue({
        globalInlineFields: [userField],
        isLoading: false,
        isLoaded: true,
      });
    });

    it('requests the profiles of a selected user-picker field with the assignees', () => {
      renderWithTestingProviders(
        <SimilarCasesTable
          {...props}
          cases={[{ ...casesWithUserPicker[0], assignees: [{ uid: firstProfile.uid }] }]}
          selectedColumns={[
            ...defaultSelectedColumns,
            { field: 'assignees', name: 'Assignees', isChecked: true },
            { field: userKey, name: 'Owner', isChecked: true },
          ]}
        />
      );

      expect(useBulkGetUserProfilesMock).toHaveBeenLastCalledWith({
        uids: [firstProfile.uid, secondProfile.uid],
      });
    });

    it('does not request the profiles of a user-picker field that is not selected', () => {
      renderWithTestingProviders(
        <SimilarCasesTable
          {...props}
          cases={casesWithUserPicker}
          selectedColumns={[
            ...defaultSelectedColumns,
            { field: userKey, name: 'Owner', isChecked: false },
          ]}
        />
      );

      expect(useBulkGetUserProfilesMock).toHaveBeenLastCalledWith({ uids: [] });
    });

    it('renders a selected user-picker field with the fetched profile', async () => {
      useBulkGetUserProfilesMock.mockReturnValue({ data: userProfilesMap });

      renderWithTestingProviders(
        <SimilarCasesTable
          {...props}
          cases={casesWithUserPicker}
          selectedColumns={[
            ...defaultSelectedColumns,
            { field: userKey, name: 'Owner', isChecked: true },
          ]}
        />
      );

      expect(
        await screen.findByTestId(
          `case-table-column-extendedField-${userKey}-${secondProfile.user.username}`
        )
      ).toBeInTheDocument();
    });
  });

  it('renders loading indicator when loading', async () => {
    renderWithTestingProviders(<SimilarCasesTable {...props} isLoading={true} />);
    expect(screen.queryByTestId('similar-cases-table')).not.toBeInTheDocument();
    expect(screen.getByTestId('similar-cases-table-loading')).toBeInTheDocument();
  });

  describe('sorting', () => {
    it('shows the sort indicator on the sorted column', async () => {
      renderWithTestingProviders(
        <SimilarCasesTable {...props} sorting={{ sort: { field: 'title', direction: 'asc' } }} />
      );

      expect(await screen.findByRole('columnheader', { name: /Name/ })).toHaveAttribute(
        'aria-sort',
        'ascending'
      );
    });

    it('reflects the sort direction in the sort indicator', async () => {
      renderWithTestingProviders(
        <SimilarCasesTable
          {...props}
          sorting={{ sort: { field: 'createdAt', direction: 'desc' } }}
        />
      );

      expect(await screen.findByRole('columnheader', { name: /Created on/ })).toHaveAttribute(
        'aria-sort',
        'descending'
      );
    });

    it('calls onChange with the sort when a sortable header is clicked', async () => {
      const onChange = jest.fn();
      renderWithTestingProviders(
        <SimilarCasesTable
          {...props}
          onChange={onChange}
          sorting={{ sort: { field: 'createdAt', direction: 'desc' } }}
        />
      );

      await userEvent.click(await screen.findByRole('button', { name: /Name/ }));

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ sort: { field: 'title', direction: 'asc' } })
      );
    });
  });
});
