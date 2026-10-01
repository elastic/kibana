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
import type { DatasetBooleanFormValue } from '../../../create_dataset_form_state';
import { HeaderRow, type HeaderRowChange } from './header_row';

const renderComponent = ({
  value = '',
  onChange = () => {},
}: {
  value?: DatasetBooleanFormValue;
  onChange?: (next: HeaderRowChange) => void;
} = {}) =>
  render(
    <EuiProvider>
      <I18nProvider>
        <HeaderRow value={value} onChange={onChange} onBlur={() => {}} isInvalid={false} />
      </I18nProvider>
    </EuiProvider>
  );

const getInput = (getByTestId: ReturnType<typeof render>['getByTestId']): HTMLInputElement => {
  const input = getByTestId('createDatasetSettingsHeaderRow').querySelector('input');
  if (!input) throw new Error('header row input not found');
  return input;
};

const openComboBox = async (getByTestId: ReturnType<typeof render>['getByTestId']) => {
  await act(async () => {
    fireEvent.click(getInput(getByTestId));
  });
};

describe('HeaderRow', () => {
  it('reports the selected option as valid', async () => {
    const onChange = jest.fn();
    const { getByTestId, getByRole } = renderComponent({ onChange });

    await openComboBox(getByTestId);

    await act(async () => {
      fireEvent.click(
        getByRole('option', { name: new RegExp(createDatasetWizardStrings.falseLabel) })
      );
    });

    expect(onChange).toHaveBeenLastCalledWith({ value: 'false', isValid: true });
  });

  it('shows a description for each option', async () => {
    const { getByTestId, getByText } = renderComponent();

    await openComboBox(getByTestId);

    expect(getByText(createDatasetWizardStrings.settingsHeaderRowTrueDescription)).toBeVisible();
    expect(getByText(createDatasetWizardStrings.settingsHeaderRowFalseDescription)).toBeVisible();
  });

  it('clearing the selection results in empty form value', async () => {
    const onChange = jest.fn();
    const { getByTestId } = renderComponent({ value: 'true', onChange });

    await act(async () => {
      fireEvent.click(getByTestId('comboBoxClearButton'));
    });

    expect(onChange).toHaveBeenLastCalledWith({ value: '', isValid: true });
  });

  it('reports typed text that has not been resolved to an option as invalid, keeping the value', async () => {
    const onChange = jest.fn();
    const { getByTestId } = renderComponent({ value: 'true', onChange });

    await act(async () => {
      fireEvent.change(getInput(getByTestId), { target: { value: 'bogus' } });
    });

    expect(onChange).toHaveBeenLastCalledWith({ value: 'true', isValid: false });
  });

  it('reports the newly selected option as valid after typed text is replaced by a selection', async () => {
    const onChange = jest.fn();
    const { getByTestId, getByRole } = renderComponent({ value: 'true', onChange });

    await act(async () => {
      fireEvent.change(getInput(getByTestId), {
        target: { value: createDatasetWizardStrings.falseLabel.slice(0, 2) },
      });
    });
    await act(async () => {
      fireEvent.click(
        getByRole('option', { name: new RegExp(createDatasetWizardStrings.falseLabel) })
      );
    });

    expect(onChange).toHaveBeenLastCalledWith({ value: 'false', isValid: true });
  });
});
