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
import { DataConditionType } from './types';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

const createEntry = (overrides: Partial<DataConditionEntry> = {}): DataConditionEntry => ({
  id: 'dc-1',
  type: DataConditionType.FIELD_CHANGE,
  field: '',
  value: 'critical',
  confirmed: false,
  ...overrides,
});

describe('DataConditionPanel', () => {
  const onChangeMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders editable inputs when the entry is not confirmed', () => {
    render(<DataConditionPanel entry={createEntry()} onChange={onChangeMock} />, { wrapper });

    expect(screen.getByTestId('dataConditionType-dc-1')).toBeTruthy();
    expect(screen.getByTestId('dataConditionField-dc-1')).toBeTruthy();
    expect(screen.getByTestId('confirmDataCondition-dc-1').closest('button')?.disabled).toBe(true);
  });

  it('calls onChange with entry updates from the form fields', () => {
    render(<DataConditionPanel entry={createEntry()} onChange={onChangeMock} />, { wrapper });

    fireEvent.change(screen.getByTestId('dataConditionType-dc-1'), {
      target: { value: DataConditionType.SEVERITY_EQUALS },
    });
    expect(onChangeMock).toHaveBeenLastCalledWith(
      createEntry({
        type: DataConditionType.SEVERITY_EQUALS,
      })
    );

    fireEvent.change(screen.getByTestId('dataConditionField-dc-1'), {
      target: { value: 'severity' },
    });
    expect(onChangeMock).toHaveBeenLastCalledWith(
      createEntry({
        field: 'severity',
      })
    );
  });

  it('confirms the entry once the condition is complete', () => {
    render(
      <DataConditionPanel
        entry={createEntry({ type: DataConditionType.FIELD_CHANGE, field: 'severity' })}
        onChange={onChangeMock}
      />,
      { wrapper }
    );

    fireEvent.click(screen.getByTestId('confirmDataCondition-dc-1'));

    expect(onChangeMock).toHaveBeenCalledWith(
      createEntry({
        type: DataConditionType.FIELD_CHANGE,
        field: 'severity',
        confirmed: true,
      })
    );
  });

  it('removes the entry from edit mode', () => {
    render(<DataConditionPanel entry={createEntry()} onChange={onChangeMock} />, { wrapper });

    fireEvent.click(screen.getByTestId('removeDataCondition-dc-1'));

    expect(onChangeMock).toHaveBeenCalledWith(null);
  });

  it('renders the confirmed chip state and allows editing', () => {
    render(
      <DataConditionPanel
        entry={createEntry({
          type: DataConditionType.FIELD_CHANGE,
          field: 'severity',
          confirmed: true,
        })}
        onChange={onChangeMock}
      />,
      { wrapper }
    );

    expect(screen.getByTestId('dataConditionChip-dc-1')).toBeTruthy();
    expect(screen.getByText('Field change')).toBeTruthy();
    expect(screen.getByText('severity')).toBeTruthy();

    fireEvent.click(screen.getByTestId('editDataCondition-dc-1'));

    expect(onChangeMock).toHaveBeenCalledWith(
      createEntry({
        type: DataConditionType.FIELD_CHANGE,
        field: 'severity',
        confirmed: false,
      })
    );
  });

  it('removes the entry from confirmed mode', () => {
    render(
      <DataConditionPanel
        entry={createEntry({
          type: DataConditionType.FIELD_CHANGE,
          field: 'severity',
          confirmed: true,
        })}
        onChange={onChangeMock}
      />,
      { wrapper }
    );

    fireEvent.click(screen.getByTestId('deleteDataCondition-dc-1'));

    expect(onChangeMock).toHaveBeenCalledWith(null);
  });
});
