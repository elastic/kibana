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

import type { DatasetErrorModeFormValue } from '../../../create_dataset_form_state';
import { ErrorModeSelect, type ErrorModeChange } from './error_mode_select';

const renderComponent = ({
  value = '',
  onChange = () => {},
}: {
  value?: DatasetErrorModeFormValue;
  onChange?: (next: ErrorModeChange) => void;
} = {}) =>
  render(
    <EuiProvider>
      <I18nProvider>
        <ErrorModeSelect value={value} onChange={onChange} onBlur={() => {}} isInvalid={false} />
      </I18nProvider>
    </EuiProvider>
  );

const getInput = (getByTestId: ReturnType<typeof render>['getByTestId']): HTMLInputElement => {
  const input = getByTestId('createDatasetSettingsErrorMode').querySelector('input');
  if (!input) throw new Error('error mode input not found');
  return input;
};

const selectOption = async (
  getByTestId: ReturnType<typeof render>['getByTestId'],
  getAllByTestId: ReturnType<typeof render>['getAllByTestId'],
  value: string
) => {
  await act(async () => {
    fireEvent.click(getInput(getByTestId));
  });
  const candidates = getAllByTestId(`createDatasetSettingsErrorModeOption-${value}`);
  const option = candidates.find((el) => el.getAttribute('role') === 'option') ?? candidates[0];
  await act(async () => {
    fireEvent.click(option);
  });
};

describe('ErrorModeSelect', () => {
  it('reports the selected option as valid', async () => {
    const onChange = jest.fn();
    const { getByTestId, getAllByTestId } = renderComponent({ onChange });

    await selectOption(getByTestId, getAllByTestId, 'skip_row');

    expect(onChange).toHaveBeenLastCalledWith({ value: 'skip_row', isValid: true });
  });

  it('reports typed text that has not been resolved to an option as invalid, keeping the value', async () => {
    const onChange = jest.fn();
    const { getByTestId } = renderComponent({ value: 'fail_fast', onChange });

    await act(async () => {
      fireEvent.change(getInput(getByTestId), { target: { value: 'bogus' } });
    });

    expect(onChange).toHaveBeenLastCalledWith({ value: 'fail_fast', isValid: false });
  });

  it('reports the newly selected option as valid after typed text is replaced by a selection', async () => {
    const onChange = jest.fn();
    const { getByTestId, getAllByTestId } = renderComponent({ value: 'fail_fast', onChange });

    await act(async () => {
      fireEvent.change(getInput(getByTestId), { target: { value: 'sk' } });
    });
    await selectOption(getByTestId, getAllByTestId, 'skip_row');

    expect(onChange).toHaveBeenLastCalledWith({ value: 'skip_row', isValid: true });
  });
});
