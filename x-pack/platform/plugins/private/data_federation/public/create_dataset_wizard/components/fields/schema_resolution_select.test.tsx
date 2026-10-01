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

import type { DatasetSchemaResolutionFormValue } from '../../create_dataset_form_state';
import { SchemaResolutionSelect, type SchemaResolutionChange } from './schema_resolution_select';

const renderComponent = ({
  value = '',
  onChange = () => {},
}: {
  value?: DatasetSchemaResolutionFormValue;
  onChange?: (next: SchemaResolutionChange) => void;
} = {}) =>
  render(
    <EuiProvider>
      <I18nProvider>
        <SchemaResolutionSelect
          value={value}
          onChange={onChange}
          onBlur={() => {}}
          isInvalid={false}
        />
      </I18nProvider>
    </EuiProvider>
  );

const getInput = (getByTestId: ReturnType<typeof render>['getByTestId']): HTMLInputElement => {
  const input = getByTestId('createDatasetWizardSchemaResolution').querySelector('input');
  if (!input) throw new Error('schema resolution input not found');
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
  const candidates = getAllByTestId(`createDatasetWizardSchemaResolutionOption-${value}`);
  const option = candidates.find((el) => el.getAttribute('role') === 'option') ?? candidates[0];
  await act(async () => {
    fireEvent.click(option);
  });
};

describe('SchemaResolutionSelect', () => {
  it('reports the selected option as valid', async () => {
    const onChange = jest.fn();
    const { getByTestId, getAllByTestId } = renderComponent({ onChange });

    await selectOption(getByTestId, getAllByTestId, 'strict');

    expect(onChange).toHaveBeenLastCalledWith({ value: 'strict', isValid: true });
  });

  it('reports typed text that has not been resolved to an option as invalid, keeping the value', async () => {
    const onChange = jest.fn();
    const { getByTestId } = renderComponent({ value: 'strict', onChange });

    await act(async () => {
      fireEvent.change(getInput(getByTestId), { target: { value: 'bogus' } });
    });

    expect(onChange).toHaveBeenLastCalledWith({ value: 'strict', isValid: false });
  });

  it('reports the newly selected option as valid after typed text is replaced by a selection', async () => {
    const onChange = jest.fn();
    const { getByTestId, getAllByTestId } = renderComponent({ value: 'strict', onChange });

    await act(async () => {
      fireEvent.change(getInput(getByTestId), { target: { value: 'uni' } });
    });
    await selectOption(getByTestId, getAllByTestId, 'union_by_name');

    expect(onChange).toHaveBeenLastCalledWith({ value: 'union_by_name', isValid: true });
  });
});
