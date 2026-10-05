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
import { HeaderRow } from './header_row';

const renderComponent = ({
  value = '',
  onChange = () => {},
}: {
  value?: DatasetBooleanFormValue;
  onChange?: (next: DatasetBooleanFormValue) => void;
} = {}) =>
  render(
    <EuiProvider>
      <I18nProvider>
        <HeaderRow value={value} onChange={onChange} onBlur={() => {}} />
      </I18nProvider>
    </EuiProvider>
  );

const openComboBox = async (getByTestId: (id: string) => HTMLElement) => {
  const combo = getByTestId('createDatasetSettingsHeaderRow');
  await act(async () => {
    fireEvent.click(combo.querySelector('input') ?? combo);
  });
};

describe('HeaderRow', () => {
  it('calls onChange when the user selects an option', async () => {
    const onChange = jest.fn();
    const { getByTestId, getByRole } = renderComponent({ onChange });

    await openComboBox(getByTestId);

    await act(async () => {
      fireEvent.click(
        getByRole('option', { name: new RegExp(createDatasetWizardStrings.falseLabel) })
      );
    });

    expect(onChange).toHaveBeenCalledWith('false');
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

    expect(onChange).toHaveBeenCalledWith('');
  });
});
