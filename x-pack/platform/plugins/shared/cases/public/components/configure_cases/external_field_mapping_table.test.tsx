/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ConnectorTypes } from '../../../common/types/domain';
import { renderWithTestingProviders } from '../../common/mock';
import { ExternalFieldMappingTable } from './external_field_mapping_table';
import { useGetExternalFieldCatalog } from './use_get_external_field_catalog';
import { useGetFieldDefinitions } from '../field_library/hooks/use_get_field_definitions';
import { useCreateFieldDefinition } from '../field_library/hooks/use_create_field_definition';

jest.mock('./use_get_external_field_catalog', () => ({
  ...jest.requireActual('./use_get_external_field_catalog'),
  useGetExternalFieldCatalog: jest.fn(),
}));
jest.mock('../field_library/hooks/use_get_field_definitions');
jest.mock('../field_library/hooks/use_create_field_definition');
jest.mock('../field_library/components/field_definition_flyout', () => ({
  FieldDefinitionFlyout: () => <div data-test-subj="field-definition-flyout-mock" />,
}));

const useGetExternalFieldCatalogMock = useGetExternalFieldCatalog as jest.Mock;
const useGetFieldDefinitionsMock = useGetFieldDefinitions as jest.Mock;
const useCreateFieldDefinitionMock = useCreateFieldDefinition as jest.Mock;

const catalog = new Map([
  ['summary', { key: 'summary', label: 'Summary' }],
  ['priority', { key: 'priority', label: 'Priority' }],
  ['customfield_10021', { key: 'customfield_10021', label: 'Due date' }],
]);

const definitions = {
  fieldDefinitions: [
    {
      fieldDefinitionId: 'fd-1',
      name: 'severity_tier',
      owner: 'securitySolution',
      isGlobal: true,
      definition: 'name: severity_tier\ncontrol: INPUT_TEXT\ntype: keyword\nlabel: Severity tier\n',
    },
    {
      fieldDefinitionId: 'fd-2',
      name: 'owner_user',
      owner: 'securitySolution',
      isGlobal: true,
      definition: 'name: owner_user\ncontrol: USER_PICKER\ntype: keyword\n',
    },
  ],
  total: 2,
};

describe('ExternalFieldMappingTable', () => {
  const onChange = jest.fn();
  const createFieldDefinition = jest.fn();
  const connector = { id: 'jira-1', name: 'Jira', type: ConnectorTypes.jira };
  // Jira's static push mapping: summary is already covered by the Field sync table.
  const mappings = [
    { source: 'title' as const, target: 'summary', actionType: 'overwrite' as const },
  ];

  const defaultProps = {
    connector,
    owner: 'securitySolution',
    mappings,
    disabled: false,
    onChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useGetExternalFieldCatalogMock.mockReturnValue({
      data: catalog,
      isLoading: false,
      isSuccess: true,
      isError: false,
    });
    useGetFieldDefinitionsMock.mockReturnValue({ data: definitions });
    useCreateFieldDefinitionMock.mockReturnValue({
      mutate: createFieldDefinition,
      isLoading: false,
    });
  });

  it('lists the external fields that are not covered by the built-in mapping', () => {
    renderWithTestingProviders(<ExternalFieldMappingTable {...defaultProps} />);

    expect(screen.getByTestId('external-field-mapping-row-priority')).toBeInTheDocument();
    expect(screen.getByTestId('external-field-mapping-row-customfield_10021')).toBeInTheDocument();
    expect(screen.queryByTestId('external-field-mapping-row-summary')).not.toBeInTheDocument();
  });

  it('offers only global fields with a plain value as case fields', () => {
    renderWithTestingProviders(<ExternalFieldMappingTable {...defaultProps} />);

    const options = within(screen.getByTestId('external-field-mapping-case-field-priority'))
      .getAllByRole('option')
      .map((option) => option.textContent);

    expect(options).toEqual(['Not synced', 'Severity tier']);
  });

  it('adds a mapping with both directions when a case field is picked', async () => {
    renderWithTestingProviders(<ExternalFieldMappingTable {...defaultProps} />);

    await userEvent.selectOptions(
      screen.getByTestId('external-field-mapping-case-field-priority'),
      'severity_tier_as_keyword'
    );

    expect(onChange).toHaveBeenCalledWith([
      { externalField: 'priority', caseField: 'severity_tier_as_keyword', direction: 'both' },
    ]);
  });

  it('shows direction and conflict controls for a mapped field and updates them', async () => {
    const value = [
      {
        externalField: 'priority',
        caseField: 'severity_tier_as_keyword',
        direction: 'both' as const,
      },
    ];
    renderWithTestingProviders(<ExternalFieldMappingTable {...defaultProps} value={value} />);

    expect(screen.getByTestId('external-field-mapping-direction-priority')).toHaveValue('both');
    expect(
      screen.queryByTestId('external-field-mapping-direction-customfield_10021')
    ).not.toBeInTheDocument();

    await userEvent.selectOptions(
      screen.getByTestId('external-field-mapping-conflict-priority'),
      'kibana'
    );
    expect(onChange).toHaveBeenLastCalledWith([
      {
        externalField: 'priority',
        caseField: 'severity_tier_as_keyword',
        direction: 'both',
        conflictStrategy: 'kibana',
      },
    ]);

    await userEvent.selectOptions(
      screen.getByTestId('external-field-mapping-direction-priority'),
      'push'
    );
    expect(onChange).toHaveBeenLastCalledWith([
      { externalField: 'priority', caseField: 'severity_tier_as_keyword', direction: 'push' },
    ]);
  });

  it('removes the mapping when "Not synced" is picked', async () => {
    const value = [
      {
        externalField: 'priority',
        caseField: 'severity_tier_as_keyword',
        direction: 'both' as const,
      },
      {
        externalField: 'customfield_10021',
        caseField: 'severity_tier_as_keyword',
        direction: 'pull' as const,
      },
    ];
    renderWithTestingProviders(<ExternalFieldMappingTable {...defaultProps} value={value} />);

    await userEvent.selectOptions(
      screen.getByTestId('external-field-mapping-case-field-priority'),
      ''
    );

    expect(onChange).toHaveBeenCalledWith([value[1]]);
  });

  it('filters the rows with the search box', async () => {
    renderWithTestingProviders(<ExternalFieldMappingTable {...defaultProps} />);

    await userEvent.type(screen.getByTestId('external-field-mapping-search'), 'due');

    expect(screen.getByTestId('external-field-mapping-row-customfield_10021')).toBeInTheDocument();
    expect(screen.queryByTestId('external-field-mapping-row-priority')).not.toBeInTheDocument();
  });

  it('opens the field library flyout to create a global field', async () => {
    renderWithTestingProviders(<ExternalFieldMappingTable {...defaultProps} />);

    await userEvent.click(screen.getByTestId('external-field-mapping-create-field'));

    expect(screen.getByTestId('field-definition-flyout-mock')).toBeInTheDocument();
  });

  it('disables the controls when disabled', () => {
    renderWithTestingProviders(<ExternalFieldMappingTable {...defaultProps} disabled />);

    expect(screen.getByTestId('external-field-mapping-case-field-priority')).toBeDisabled();
    expect(screen.getByTestId('external-field-mapping-create-field')).toBeDisabled();
  });

  it('explains when the catalog could not be loaded', () => {
    useGetExternalFieldCatalogMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isSuccess: false,
      isError: true,
    });

    renderWithTestingProviders(<ExternalFieldMappingTable {...defaultProps} />);

    expect(screen.getByTestId('external-field-mapping-error')).toBeInTheDocument();
    expect(screen.queryByTestId('external-field-mapping-search')).not.toBeInTheDocument();
  });

  it('explains when the connector exposes no additional fields', () => {
    useGetExternalFieldCatalogMock.mockReturnValue({
      data: new Map([['summary', { key: 'summary', label: 'Summary' }]]),
      isLoading: false,
      isSuccess: true,
      isError: false,
    });

    renderWithTestingProviders(<ExternalFieldMappingTable {...defaultProps} />);

    expect(screen.getByTestId('external-field-mapping-empty')).toBeInTheDocument();
  });
});
