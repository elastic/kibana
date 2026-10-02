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
import { mappings } from '../../containers/configure/mock';
import { FieldSyncTable } from './field_sync_table';
import { useGetExternalFieldCatalog } from './use_get_external_field_catalog';

jest.mock('./use_get_external_field_catalog', () => ({
  ...jest.requireActual('./use_get_external_field_catalog'),
  useGetExternalFieldCatalog: jest.fn(),
}));

const useGetExternalFieldCatalogMock = useGetExternalFieldCatalog as jest.Mock;

describe('FieldSyncTable', () => {
  const onChange = jest.fn();
  const connector = { id: 'sn-1', name: 'My ServiceNow', type: ConnectorTypes.serviceNowITSM };

  const defaultProps = {
    connector,
    mappings,
    disabled: false,
    onChange,
  };

  const allRows = () => ({
    title: { field: 'title', direction: 'both' },
    description: { field: 'description', direction: 'both' },
    status: { field: 'status', direction: 'pull' },
    tags: { field: 'tags', direction: 'push' },
    comments: { field: 'comments', direction: 'push' },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    useGetExternalFieldCatalogMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isSuccess: false,
    });
  });

  it('renders one row per field with the default directions', () => {
    renderWithTestingProviders(<FieldSyncTable {...defaultProps} />);

    expect(screen.getByTestId('external-sync-field-table')).toBeInTheDocument();
    expect(screen.getByTestId('external-sync-direction-title')).toHaveValue('both');
    expect(screen.getByTestId('external-sync-direction-description')).toHaveValue('both');
    expect(screen.getByTestId('external-sync-direction-status')).toHaveValue('pull');
    expect(screen.getByTestId('external-sync-direction-tags')).toHaveValue('push');
    expect(screen.getByTestId('external-sync-direction-comments')).toHaveValue('push');
    expect(screen.getByTestId('external-sync-conflict-title')).toHaveValue('default');
  });

  it('offers only the directions each field supports', () => {
    renderWithTestingProviders(<FieldSyncTable {...defaultProps} />);

    const statusOptions = within(screen.getByTestId('external-sync-direction-status'))
      .getAllByRole('option')
      .map((option) => option.getAttribute('value'));
    const commentsOptions = within(screen.getByTestId('external-sync-direction-comments'))
      .getAllByRole('option')
      .map((option) => option.getAttribute('value'));

    expect(statusOptions).toEqual(['pull', 'off']);
    expect(commentsOptions).toEqual(['push', 'off']);
    expect(screen.queryByTestId('external-sync-conflict-tags')).not.toBeInTheDocument();
    expect(screen.queryByTestId('external-sync-conflict-comments')).not.toBeInTheDocument();
  });

  it('shows the mapped external field key and the connector name in the column header', () => {
    renderWithTestingProviders(<FieldSyncTable {...defaultProps} />);

    expect(
      within(screen.getByTestId('external-sync-field-row-title')).getByText('short_description')
    ).toBeInTheDocument();
    expect(screen.getByText('My ServiceNow field')).toBeInTheDocument();
    expect(screen.getByText('Status (mapped automatically)')).toBeInTheDocument();
    expect(screen.getByText('Not mapped')).toBeInTheDocument();
  });

  it('shows the catalog label and flags a mapped field the catalog does not contain', () => {
    useGetExternalFieldCatalogMock.mockReturnValue({
      data: new Map([
        ['short_description', { key: 'short_description', label: 'Short description' }],
      ]),
      isLoading: false,
      isSuccess: true,
    });

    renderWithTestingProviders(<FieldSyncTable {...defaultProps} />);

    expect(screen.getByText('Short description')).toBeInTheDocument();
    expect(screen.queryByTestId('external-sync-field-missing-title')).not.toBeInTheDocument();
    expect(screen.getByTestId('external-sync-field-missing-description')).toBeInTheDocument();
  });

  it('shows a spinner in the header while the catalog loads', () => {
    useGetExternalFieldCatalogMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      isSuccess: false,
    });

    renderWithTestingProviders(<FieldSyncTable {...defaultProps} />);

    expect(screen.getByTestId('external-sync-field-catalog-loading')).toBeInTheDocument();
  });

  it('emits every rule when a direction changes', async () => {
    renderWithTestingProviders(<FieldSyncTable {...defaultProps} />);

    await userEvent.selectOptions(
      screen.getByTestId('external-sync-direction-description'),
      'pull'
    );

    expect(onChange).toHaveBeenCalledWith([
      allRows().title,
      { field: 'description', direction: 'pull' },
      allRows().status,
      allRows().tags,
      allRows().comments,
    ]);
  });

  it('emits a per-field conflict rule and clears it on "Use default"', async () => {
    const { rerender } = renderWithTestingProviders(<FieldSyncTable {...defaultProps} />);

    await userEvent.selectOptions(screen.getByTestId('external-sync-conflict-title'), 'kibana');

    expect(onChange).toHaveBeenLastCalledWith([
      { field: 'title', direction: 'both', conflictStrategy: 'kibana' },
      allRows().description,
      allRows().status,
      allRows().tags,
      allRows().comments,
    ]);

    rerender(
      <FieldSyncTable
        {...defaultProps}
        rules={[{ field: 'title', direction: 'both', conflictStrategy: 'kibana' }]}
      />
    );
    expect(screen.getByTestId('external-sync-conflict-title')).toHaveValue('kibana');

    await userEvent.selectOptions(screen.getByTestId('external-sync-conflict-title'), 'default');

    expect(onChange).toHaveBeenLastCalledWith([
      allRows().title,
      allRows().description,
      allRows().status,
      allRows().tags,
      allRows().comments,
    ]);
  });

  it('disables the conflict rule for a field that does not pull', () => {
    renderWithTestingProviders(
      <FieldSyncTable {...defaultProps} rules={[{ field: 'title', direction: 'push' }]} />
    );

    expect(screen.getByTestId('external-sync-conflict-title')).toBeDisabled();
    expect(screen.getByTestId('external-sync-conflict-description')).toBeEnabled();
  });

  it('disables every control when disabled', () => {
    renderWithTestingProviders(<FieldSyncTable {...defaultProps} disabled />);

    expect(screen.getByTestId('external-sync-direction-title')).toBeDisabled();
    expect(screen.getByTestId('external-sync-conflict-title')).toBeDisabled();
    expect(screen.getByTestId('external-sync-direction-comments')).toBeDisabled();
  });

  it('tells webhook users the field is set in the connector', () => {
    renderWithTestingProviders(
      <FieldSyncTable
        {...defaultProps}
        connector={{ id: 'wh-1', name: 'Webhook', type: ConnectorTypes.casesWebhook }}
        mappings={[]}
      />
    );

    expect(screen.getAllByText('Set in the connector')).toHaveLength(3);
  });
});
