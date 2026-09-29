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
import { TrimSpaces } from './trim_spaces';

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
        <TrimSpaces value={value} onChange={onChange} onBlur={() => {}} />
      </I18nProvider>
    </EuiProvider>
  );

describe('TrimSpaces', () => {
  it.each([
    ['true', createDatasetWizardStrings.trueLabel],
    ['false', createDatasetWizardStrings.falseLabel],
  ] as const)('calls onChange with %s when the user selects it', async (expected, label) => {
    const onChange = jest.fn();
    const { getByTestId, getByRole } = renderComponent({ onChange });

    const combo = getByTestId('createDatasetSettingsTrimSpaces');
    await act(async () => {
      fireEvent.click(combo.querySelector('input') ?? combo);
    });

    await act(async () => {
      fireEvent.click(getByRole('option', { name: new RegExp(`^${label}`) }));
    });

    expect(onChange).toHaveBeenCalledWith(expected);
  });

  it('displays false when the value is false', () => {
    const { getByTestId } = renderComponent({ value: 'false' });

    expect(getByTestId('createDatasetSettingsTrimSpaces').querySelector('input')).toHaveValue(
      createDatasetWizardStrings.falseLabel
    );
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
