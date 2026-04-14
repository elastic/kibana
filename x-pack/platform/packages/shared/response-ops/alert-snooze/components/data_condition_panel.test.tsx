/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { DataConditionPanel } from './data_condition_panel';
import type { DataConditionEntry } from './data_condition_panel';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

const fieldOptions = [
  { value: 'severity', text: 'severity' },
  { value: 'status', text: 'status' },
];

const createEntry = (overrides: Partial<DataConditionEntry> = {}): DataConditionEntry => ({
  id: 'dc-1',
  field: '',
  operator: 'is',
  value: '',
  confirmed: false,
  logicalOperator: 'and',
  ...overrides,
});

describe('DataConditionPanel', () => {
  const onChangeMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders editable inputs when the entry is not confirmed', () => {
    render(
      <DataConditionPanel
        entry={createEntry()}
        fieldOptions={fieldOptions}
        onChange={onChangeMock}
      />,
      { wrapper }
    );

    expect(screen.getByTestId('dataConditionField-dc-1')).toBeInTheDocument();
    expect(screen.getByTestId('dataConditionOperator-dc-1')).toBeInTheDocument();
    expect(screen.getByTestId('dataConditionValue-dc-1')).toBeInTheDocument();
    expect(screen.getByTestId('confirmDataCondition-dc-1')).toBeDisabled();
  });

  it('calls onChange with entry updates from the form fields', () => {
    render(
      <DataConditionPanel
        entry={createEntry()}
        fieldOptions={fieldOptions}
        onChange={onChangeMock}
      />,
      { wrapper }
    );

    fireEvent.change(screen.getByTestId('dataConditionField-dc-1'), {
      target: { value: 'severity' },
    });
    expect(onChangeMock).toHaveBeenLastCalledWith(
      createEntry({
        field: 'severity',
      })
    );

    fireEvent.change(screen.getByTestId('dataConditionOperator-dc-1'), {
      target: { value: 'is_not' },
    });
    expect(onChangeMock).toHaveBeenLastCalledWith(
      createEntry({
        operator: 'is_not',
      })
    );

    fireEvent.change(screen.getByTestId('dataConditionValue-dc-1'), {
      target: { value: 'high' },
    });
    expect(onChangeMock).toHaveBeenLastCalledWith(
      createEntry({
        value: 'high',
      })
    );
  });

  it('confirms the entry once the condition is complete', () => {
    render(
      <DataConditionPanel
        entry={createEntry({ field: 'severity', value: 'high' })}
        fieldOptions={fieldOptions}
        onChange={onChangeMock}
      />,
      { wrapper }
    );

    fireEvent.click(screen.getByTestId('confirmDataCondition-dc-1'));

    expect(onChangeMock).toHaveBeenCalledWith(
      createEntry({
        field: 'severity',
        value: 'high',
        confirmed: true,
      })
    );
  });

  it('removes the entry from edit mode', () => {
    render(
      <DataConditionPanel
        entry={createEntry()}
        fieldOptions={fieldOptions}
        onChange={onChangeMock}
      />,
      { wrapper }
    );

    fireEvent.click(screen.getByTestId('removeDataCondition-dc-1'));

    expect(onChangeMock).toHaveBeenCalledWith(null);
  });

  it('renders the confirmed chip state and allows editing', () => {
    render(
      <DataConditionPanel
        entry={createEntry({
          field: 'severity',
          operator: 'is_not',
          value: 'low',
          confirmed: true,
        })}
        fieldOptions={fieldOptions}
        onChange={onChangeMock}
      />,
      { wrapper }
    );

    expect(screen.getByTestId('dataConditionChip-dc-1')).toBeInTheDocument();
    expect(screen.getByText('severity')).toBeInTheDocument();
    expect(screen.getByText('is_not')).toBeInTheDocument();
    expect(screen.getByText('low')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('editDataCondition-dc-1'));

    expect(onChangeMock).toHaveBeenCalledWith(
      createEntry({
        field: 'severity',
        operator: 'is_not',
        value: 'low',
        confirmed: false,
      })
    );
  });

  it('removes the entry from confirmed mode', () => {
    render(
      <DataConditionPanel
        entry={createEntry({
          field: 'severity',
          value: 'high',
          confirmed: true,
        })}
        fieldOptions={fieldOptions}
        onChange={onChangeMock}
      />,
      { wrapper }
    );

    fireEvent.click(screen.getByTestId('deleteDataCondition-dc-1'));

    expect(onChangeMock).toHaveBeenCalledWith(null);
  });
});
