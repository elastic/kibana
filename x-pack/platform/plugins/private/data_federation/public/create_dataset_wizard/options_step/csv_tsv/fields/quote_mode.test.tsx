/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { act, fireEvent, render } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { createDatasetWizardStrings } from '../../../create_dataset_wizard_i18n';
import type { DatasetModeFormValue } from '../../../create_dataset_form_state';
import { QuoteMode, type QuoteModeChange } from './quote_mode';

const renderComponent = ({
  value = '',
  onChange = () => {},
}: {
  value?: DatasetModeFormValue;
  onChange?: (next: QuoteModeChange) => void;
} = {}) => {
  return render(
    <EuiProvider>
      <I18nProvider>
        <QuoteMode
          value={value}
          onChange={onChange}
          onBlur={() => {}}
          isInvalid={false}
          defaultValue="quoted"
        />
      </I18nProvider>
    </EuiProvider>
  );
};

const getInput = (getByTestId: ReturnType<typeof render>['getByTestId']): HTMLInputElement => {
  const input = getByTestId('createDatasetSettingsMode').querySelector('input');
  if (!input) throw new Error('quote mode input not found');
  return input;
};

const selectOption = async (
  getByTestId: ReturnType<typeof render>['getByTestId'],
  getAllByTestId: ReturnType<typeof render>['getAllByTestId'],
  mode: string
) => {
  await act(async () => {
    fireEvent.click(getInput(getByTestId));
  });
  const candidates = getAllByTestId(`createDatasetSettingsModeOption-${mode}`);
  const option = candidates.find((el) => el.getAttribute('role') === 'option') ?? candidates[0];
  await act(async () => {
    fireEvent.click(option);
  });
};

describe('QuoteMode', () => {
  it('reports the selected mode as valid', async () => {
    const onChange = jest.fn();
    const { getByTestId, getAllByTestId } = renderComponent({ onChange });

    await selectOption(getByTestId, getAllByTestId, 'plain');

    expect(onChange).toHaveBeenLastCalledWith({ value: 'plain', isValid: true });
  });

  it('reports typed text that has not been resolved to an option as invalid, keeping the value', async () => {
    const onChange = jest.fn();
    const { getByTestId } = renderComponent({ value: 'quoted', onChange });

    await act(async () => {
      fireEvent.change(getInput(getByTestId), { target: { value: 'bogus' } });
    });

    expect(onChange).toHaveBeenLastCalledWith({ value: 'quoted', isValid: false });
  });

  it('reports the newly selected mode as valid after typed text is replaced by a selection', async () => {
    const onChange = jest.fn();
    const { getByTestId, getAllByTestId } = renderComponent({ value: 'quoted', onChange });

    await act(async () => {
      fireEvent.change(getInput(getByTestId), { target: { value: 'pla' } });
    });
    await selectOption(getByTestId, getAllByTestId, 'plain');

    expect(onChange).toHaveBeenLastCalledWith({ value: 'plain', isValid: true });
  });

  it('shows the default badge on the default option', async () => {
    const { getByTestId, getAllByText } = renderComponent();

    const combo = getByTestId('createDatasetSettingsMode');
    await act(async () => {
      fireEvent.click(combo.querySelector('input') ?? combo);
    });

    // Only the default option should have a single default badge.
    expect(getAllByText(createDatasetWizardStrings.defaultBadgeLabel)).toHaveLength(1);
  });
});
