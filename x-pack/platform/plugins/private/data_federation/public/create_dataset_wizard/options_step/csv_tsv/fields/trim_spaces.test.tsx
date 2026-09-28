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
import { TrimSpaces } from './trim_spaces';

const renderComponent = ({
  value = false,
  onChange = () => {},
}: {
  value?: boolean;
  onChange?: (next: boolean) => void;
} = {}) =>
  render(
    <EuiProvider>
      <I18nProvider>
        <TrimSpaces value={value} onChange={onChange} onBlur={() => {}} />
      </I18nProvider>
    </EuiProvider>
  );

describe('TrimSpaces', () => {
  it('calls onChange when the user selects an option', async () => {
    const onChange = jest.fn();
    const { getByTestId, getByRole } = renderComponent({ onChange });

    const combo = getByTestId('createDatasetSettingsTrimSpaces');
    await act(async () => {
      fireEvent.click(combo.querySelector('input') ?? combo);
    });

    await act(async () => {
      fireEvent.click(getByRole('option', { name: createDatasetWizardStrings.trueLabel }));
    });

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('clearing the selection results in false', async () => {
    const onChange = jest.fn();
    const { getByTestId } = renderComponent({ value: true, onChange });

    // Click clear button.
    await act(async () => {
      fireEvent.click(getByTestId('comboBoxClearButton'));
    });

    expect(onChange).toHaveBeenCalledWith(false);
  });
});
