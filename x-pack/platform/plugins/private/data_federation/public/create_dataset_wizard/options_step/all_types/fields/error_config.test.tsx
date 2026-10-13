/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { act, fireEvent, render, within } from '@testing-library/react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { I18nProvider } from '@kbn/i18n-react';

import type {
  CreateDatasetFormValues,
  DatasetErrorModeFormValue,
} from '../../../create_dataset_form_state';
import { emptyDatasetFormValues } from '../../../dataset_form_initial_values';
import { ErrorConfig } from './error_config';

const renderErrorConfig = (errorMode: DatasetErrorModeFormValue = 'skip_row') => {
  const Wrapper = () => {
    const defaultValues = emptyDatasetFormValues();
    const methods = useForm<CreateDatasetFormValues>({
      defaultValues: {
        ...defaultValues,
        settings: { ...defaultValues.settings, error_mode: errorMode },
      },
    });
    const [maxErrors, maxErrorRatio] = useWatch({
      control: methods.control,
      name: ['settings.max_errors', 'settings.max_error_ratio'],
    });

    return (
      <FormProvider {...methods}>
        <ErrorConfig control={methods.control} />
        <div data-test-subj="maxErrorsValue">{maxErrors}</div>
        <div data-test-subj="maxErrorRatioValue">{maxErrorRatio}</div>
      </FormProvider>
    );
  };

  return render(
    <EuiProvider>
      <I18nProvider>
        <Wrapper />
      </I18nProvider>
    </EuiProvider>
  );
};

describe('ErrorConfig', () => {
  it('always shows the error mode select', () => {
    const { getByTestId } = renderErrorConfig('');
    expect(getByTestId('createDatasetSettingsErrorMode')).toBeInTheDocument();
  });

  it.each<DatasetErrorModeFormValue>(['skip_row', 'null_field'])(
    'shows max errors and max error ratio when the error mode is %s',
    (errorMode) => {
      const { getByTestId } = renderErrorConfig(errorMode);
      expect(getByTestId('createDatasetSettingsMaxErrors')).toBeInTheDocument();
      expect(getByTestId('createDatasetSettingsMaxErrorRatio')).toBeInTheDocument();
    }
  );

  it.each<DatasetErrorModeFormValue>(['', 'fail_fast'])(
    'hides max errors and max error ratio when the error mode is "%s"',
    (errorMode) => {
      const { queryByTestId } = renderErrorConfig(errorMode);
      expect(queryByTestId('createDatasetSettingsMaxErrors')).toBeNull();
      expect(queryByTestId('createDatasetSettingsMaxErrorRatio')).toBeNull();
    }
  );

  const fillBudgets = (getByTestId: ReturnType<typeof render>['getByTestId']) => {
    fireEvent.change(getByTestId('createDatasetSettingsMaxErrors'), { target: { value: '5' } });
    fireEvent.change(getByTestId('createDatasetSettingsMaxErrorRatio'), {
      target: { value: '0.5' },
    });
    expect(getByTestId('maxErrorsValue')).toHaveTextContent('5');
    expect(getByTestId('maxErrorRatioValue')).toHaveTextContent('0.5');
  };

  const expectBudgetsClearedAndHidden = ({
    getByTestId,
    queryByTestId,
  }: Pick<ReturnType<typeof render>, 'getByTestId' | 'queryByTestId'>) => {
    expect(queryByTestId('createDatasetSettingsMaxErrors')).toBeNull();
    expect(queryByTestId('createDatasetSettingsMaxErrorRatio')).toBeNull();
    expect(getByTestId('maxErrorsValue')).toHaveTextContent('');
    expect(getByTestId('maxErrorRatioValue')).toHaveTextContent('');
  };

  it('clears max errors and max error ratio when fail_fast is selected', async () => {
    const rendered = renderErrorConfig('null_field');
    const { getByTestId, findByTestId } = rendered;
    fillBudgets(getByTestId);

    const combo = getByTestId('createDatasetSettingsErrorMode');
    await act(async () => {
      fireEvent.click(combo.querySelector('input') ?? combo);
    });
    await act(async () => {
      fireEvent.click(await findByTestId('createDatasetSettingsErrorModeOption-fail_fast'));
    });

    expectBudgetsClearedAndHidden(rendered);
  });

  it('clears max errors and max error ratio when the error mode is cleared to the default', async () => {
    const rendered = renderErrorConfig('skip_row');
    const { getByTestId } = rendered;
    fillBudgets(getByTestId);

    await act(async () => {
      fireEvent.click(
        within(getByTestId('createDatasetSettingsErrorMode')).getByTestId('comboBoxClearButton')
      );
    });

    expectBudgetsClearedAndHidden(rendered);
  });
});
