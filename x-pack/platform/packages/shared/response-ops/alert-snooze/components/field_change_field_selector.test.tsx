/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { FieldChangeFieldSelector } from './field_change_field_selector';
import type { DataConditionEntry } from './types';
import { DataConditionType } from './types';

const OPTIONS: Array<EuiComboBoxOptionOption<string>> = [
  { label: 'kibana.alert.status', value: 'kibana.alert.status' },
  { label: 'kibana.alert.reason', value: 'kibana.alert.reason' },
];

const entry = (overrides: Partial<DataConditionEntry> = {}): DataConditionEntry => ({
  id: 'dc-1',
  type: DataConditionType.FIELD_CHANGE,
  field: '',
  value: 'critical',
  confirmed: false,
  ...overrides,
});

const renderSelector = (node: React.ReactElement) =>
  render(<IntlProvider locale="en">{node}</IntlProvider>);

describe('FieldChangeFieldSelector', () => {
  it('offers the provided leaf scalar fields as options', async () => {
    renderSelector(
      <FieldChangeFieldSelector entry={entry()} onChange={jest.fn()} options={OPTIONS} />
    );

    await userEvent.click(screen.getByRole('combobox'));

    expect(screen.getByText('kibana.alert.reason')).toBeInTheDocument();
    expect(screen.getByText('kibana.alert.status')).toBeInTheDocument();
  });

  it('calls onChange with the selected field value', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onChange = jest.fn();
    renderSelector(
      <FieldChangeFieldSelector entry={entry()} onChange={onChange} options={OPTIONS} />
    );

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByText('kibana.alert.status'));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'dc-1', field: 'kibana.alert.status' })
    );
  });

  it('shows the current field as the selected option', () => {
    renderSelector(
      <FieldChangeFieldSelector
        entry={entry({ field: 'kibana.alert.status' })}
        onChange={jest.fn()}
        options={OPTIONS}
      />
    );

    expect(screen.getByTestId('comboBoxSearchInput')).toHaveValue('kibana.alert.status');
  });

  it('clears the field when the selection is removed', async () => {
    const onChange = jest.fn();
    renderSelector(
      <FieldChangeFieldSelector
        entry={entry({ field: 'kibana.alert.status' })}
        onChange={onChange}
        options={OPTIONS}
      />
    );

    await userEvent.click(screen.getByTestId('comboBoxClearButton'));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ field: '' }));
  });

  it('renders no options when the options list is empty', async () => {
    renderSelector(<FieldChangeFieldSelector entry={entry()} onChange={jest.fn()} options={[]} />);

    await userEvent.click(screen.getByRole('combobox'));

    expect(screen.queryByText('kibana.alert.status')).not.toBeInTheDocument();
  });
});
