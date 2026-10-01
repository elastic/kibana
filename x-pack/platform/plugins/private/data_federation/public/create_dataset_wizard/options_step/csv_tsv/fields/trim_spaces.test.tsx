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
import { TrimSpaces, type TrimSpacesChange } from './trim_spaces';

const renderComponent = ({
  value = '',
  onChange = () => {},
}: {
  value?: DatasetBooleanFormValue;
  onChange?: (next: TrimSpacesChange) => void;
} = {}) =>
  render(
    <EuiProvider>
      <I18nProvider>
        <TrimSpaces value={value} onChange={onChange} onBlur={() => {}} isInvalid={false} />
      </I18nProvider>
    </EuiProvider>
  );

const getInput = (getByTestId: ReturnType<typeof render>['getByTestId']): HTMLInputElement => {
  const input = getByTestId('createDatasetSettingsTrimSpaces').querySelector('input');
  if (!input) throw new Error('trim spaces input not found');
  return input;
};

describe('TrimSpaces', () => {
  it.each([
    ['true', createDatasetWizardStrings.trueLabel],
    ['false', createDatasetWizardStrings.falseLabel],
  ] as const)('reports %s as valid when the user selects it', async (expected, label) => {
    const onChange = jest.fn();
    const { getByTestId, getByRole } = renderComponent({ onChange });

    await act(async () => {
      fireEvent.click(getInput(getByTestId));
    });

    await act(async () => {
      fireEvent.click(getByRole('option', { name: new RegExp(`^${label}`) }));
    });

    expect(onChange).toHaveBeenLastCalledWith({ value: expected, isValid: true });
  });

  it('reports typed text that has not been resolved to an option as invalid, keeping the value', async () => {
    const onChange = jest.fn();
    const { getByTestId } = renderComponent({ value: 'false', onChange });

    await act(async () => {
      fireEvent.change(getInput(getByTestId), { target: { value: 'bogus' } });
    });

    expect(onChange).toHaveBeenLastCalledWith({ value: 'false', isValid: false });
  });

  it('reports the newly selected option as valid after typed text is replaced by a selection', async () => {
    const onChange = jest.fn();
    const { getByTestId, getByRole } = renderComponent({ value: 'false', onChange });

    await act(async () => {
      fireEvent.change(getInput(getByTestId), {
        target: { value: createDatasetWizardStrings.trueLabel.slice(0, 2) },
      });
    });
    await act(async () => {
      fireEvent.click(
        getByRole('option', { name: new RegExp(`^${createDatasetWizardStrings.trueLabel}`) })
      );
    });

    expect(onChange).toHaveBeenLastCalledWith({ value: 'true', isValid: true });
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

    expect(onChange).toHaveBeenLastCalledWith({ value: '', isValid: true });
  });
});
