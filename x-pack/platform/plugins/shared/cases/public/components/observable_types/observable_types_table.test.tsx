/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithTestingProviders } from '../../common/mock';
import type { ObservableTypesTableProps } from './observable_types_table';
import { ObservableTypesTable } from './observable_types_table';

const customType = {
  key: 'employee-id',
  label: 'Employee ID',
  paths: [{ path: 'user.employee_id', enabled: true }],
};
const agentIdOverride = {
  key: 'observable-type-agent-id',
  label: 'Agent id',
  paths: [{ path: 'agent.id', enabled: false }],
};

const expandRow = async (key: string) => {
  fireEvent.click(await screen.findByTestId(`observable-type-expand-${key}`));
};

describe('ObservableTypesTable', () => {
  const props: ObservableTypesTableProps = {
    observableTypes: [customType],
    disabled: false,
    onChange: jest.fn(),
    onEditObservableType: jest.fn(),
    onDeleteObservableType: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the built-in types and the custom types', async () => {
    renderWithTestingProviders(<ObservableTypesTable {...props} />);

    expect(await screen.findByTestId('observable-type-observable-type-ipv4')).toBeInTheDocument();
    expect(screen.getByTestId('observable-type-employee-id')).toBeInTheDocument();
  });

  it('shows the fields only when a row is expanded', async () => {
    renderWithTestingProviders(<ObservableTypesTable {...props} />);

    expect(
      await screen.findByTestId('observable-type-observable-type-hostname')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('observable-type-paths-observable-type-hostname')
    ).not.toBeInTheDocument();

    await expandRow('observable-type-hostname');
    expect(
      await screen.findByTestId('observable-type-paths-observable-type-hostname')
    ).toBeInTheDocument();

    await expandRow('observable-type-hostname');
    expect(
      screen.queryByTestId('observable-type-paths-observable-type-hostname')
    ).not.toBeInTheDocument();
  });

  it('shows the number of extracted fields', async () => {
    renderWithTestingProviders(
      <ObservableTypesTable {...props} observableTypes={[customType, agentIdOverride]} />
    );

    expect(
      await screen.findByTestId('observable-type-fields-count-observable-type-agent-id')
    ).toHaveTextContent('0 of 1 extracted');
    expect(screen.getByTestId('observable-type-fields-count-employee-id')).toHaveTextContent(
      '1 of 1 extracted'
    );
  });

  it('shows the value pattern of each type', async () => {
    renderWithTestingProviders(
      <ObservableTypesTable
        {...props}
        observableTypes={[
          { ...customType, valuePattern: '^E\\d{6}$' },
          { key: 'ticket-ref', label: 'Ticket ref' },
        ]}
      />
    );

    expect(
      await screen.findByTestId('observable-type-value-pattern-employee-id')
    ).toHaveTextContent('^E\\d{6}$');
    expect(screen.getByTestId('observable-type-value-pattern-ticket-ref')).toHaveTextContent(
      'None'
    );
    expect(
      screen.getByTestId('observable-type-value-pattern-observable-type-ipv4')
    ).toHaveTextContent('^[^:]*$');
    expect(
      screen.getByTestId('observable-type-value-pattern-observable-type-hostname')
    ).toHaveTextContent('None');
  });

  it('shows no delete button for a default field, and one for an added field', async () => {
    renderWithTestingProviders(<ObservableTypesTable {...props} />);

    await expandRow('observable-type-hostname');
    await expandRow('employee-id');

    expect(
      await screen.findByTestId('observable-type-path-switch-observable-type-hostname-host.name')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('observable-type-path-remove-observable-type-hostname-host.name')
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId('observable-type-path-remove-employee-id-user.employee_id')
    ).toBeInTheDocument();
  });

  it('turns off a default field and keeps the custom types', async () => {
    renderWithTestingProviders(<ObservableTypesTable {...props} />);

    await expandRow('observable-type-ipv4');
    fireEvent.click(
      await screen.findByTestId('observable-type-path-switch-observable-type-ipv4-source.ip')
    );

    expect(props.onChange).toHaveBeenCalledWith([
      customType,
      {
        key: 'observable-type-ipv4',
        label: 'IPv4',
        paths: [{ path: 'source.ip', enabled: false }],
      },
    ]);
  });

  it('adds a field to a built-in type', async () => {
    renderWithTestingProviders(<ObservableTypesTable {...props} />);

    await expandRow('observable-type-url');
    fireEvent.change(await screen.findByTestId('observable-type-path-input-observable-type-url'), {
      target: { value: ' url.full ' },
    });
    fireEvent.click(screen.getByTestId('observable-type-add-path-observable-type-url'));

    expect(props.onChange).toHaveBeenCalledWith([
      customType,
      { key: 'observable-type-url', label: 'URL', paths: [{ path: 'url.full', enabled: true }] },
    ]);
  });

  it('adds an excluded value to a default field', async () => {
    renderWithTestingProviders(<ObservableTypesTable {...props} />);

    await expandRow('observable-type-ipv4');
    const excludedValues = await screen.findByTestId(
      'observable-type-path-excluded-values-observable-type-ipv4-source.ip'
    );
    await userEvent.type(
      within(excludedValues).getByTestId('comboBoxSearchInput'),
      ' 127.0.0.1 {enter}'
    );

    expect(props.onChange).toHaveBeenCalledWith([
      customType,
      {
        key: 'observable-type-ipv4',
        label: 'IPv4',
        paths: [{ path: 'source.ip', enabled: true, excludedValues: ['127.0.0.1'] }],
      },
    ]);
  });

  it('removes the last excluded value of a default field and its override', async () => {
    const ipv4Override = {
      key: 'observable-type-ipv4',
      label: 'IPv4',
      paths: [{ path: 'source.ip', enabled: true, excludedValues: ['127.0.0.1'] }],
    };
    renderWithTestingProviders(
      <ObservableTypesTable {...props} observableTypes={[customType, ipv4Override]} />
    );

    await expandRow('observable-type-ipv4');
    const excludedValues = await screen.findByTestId(
      'observable-type-path-excluded-values-observable-type-ipv4-source.ip'
    );
    await userEvent.click(within(excludedValues).getByTestId('comboBoxClearButton'));

    expect(props.onChange).toHaveBeenCalledWith([customType]);
  });

  it('deletes a field of a custom type and keeps the overrides', async () => {
    renderWithTestingProviders(
      <ObservableTypesTable {...props} observableTypes={[customType, agentIdOverride]} />
    );

    await expandRow('employee-id');
    fireEvent.click(
      await screen.findByTestId('observable-type-path-remove-employee-id-user.employee_id')
    );

    expect(props.onChange).toHaveBeenCalledWith([{ ...customType, paths: [] }, agentIdOverride]);
  });

  it('does not add a field that the type already has', async () => {
    renderWithTestingProviders(<ObservableTypesTable {...props} />);

    await expandRow('observable-type-hostname');
    fireEvent.change(
      await screen.findByTestId('observable-type-path-input-observable-type-hostname'),
      { target: { value: 'host.name' } }
    );

    expect(screen.getByTestId('observable-type-add-path-observable-type-hostname')).toBeDisabled();
  });

  it('removes all overrides on reset and keeps the custom types', async () => {
    renderWithTestingProviders(
      <ObservableTypesTable {...props} observableTypes={[customType, agentIdOverride]} />
    );

    fireEvent.click(await screen.findByTestId('observable-types-reset'));

    expect(props.onChange).toHaveBeenCalledWith([customType]);
  });

  it('disables reset when no built-in type is changed', async () => {
    renderWithTestingProviders(<ObservableTypesTable {...props} />);

    expect(await screen.findByTestId('observable-types-reset')).toBeDisabled();
  });

  it('shows edit and delete only for custom types', async () => {
    renderWithTestingProviders(<ObservableTypesTable {...props} />);

    expect(await screen.findByTestId('employee-id-observable-type-edit')).toBeInTheDocument();
    expect(
      screen.queryByTestId('observable-type-ipv4-observable-type-edit')
    ).not.toBeInTheDocument();
  });

  it('edits and deletes a custom type', async () => {
    renderWithTestingProviders(<ObservableTypesTable {...props} />);

    fireEvent.click(await screen.findByTestId('employee-id-observable-type-edit'));
    expect(props.onEditObservableType).toHaveBeenCalledWith('employee-id');

    fireEvent.click(screen.getByTestId('employee-id-observable-type-delete'));
    fireEvent.click(await screen.findByTestId('confirmModalConfirmButton'));
    expect(props.onDeleteObservableType).toHaveBeenCalledWith('employee-id');
  });
});
