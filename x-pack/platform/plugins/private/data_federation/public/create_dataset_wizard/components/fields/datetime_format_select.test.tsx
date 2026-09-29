/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { act, fireEvent, render } from '@testing-library/react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { I18nProvider } from '@kbn/i18n-react';

import type { CreateDatasetFormValues } from '../../create_dataset_form_state';
import { emptyDatasetFormValues } from '../../dataset_form_initial_values';
import { DatetimeFormatSelect } from './datetime_format_select';

const renderComponent = () => {
  const Wrapper = () => {
    const methods = useForm<CreateDatasetFormValues>({
      defaultValues: emptyDatasetFormValues(),
    });

    const datetimeFormat = useWatch({ control: methods.control, name: 'settings.datetime_format' });

    return (
      <FormProvider {...methods}>
        <DatetimeFormatSelect control={methods.control} />
        <div data-test-subj="datetimeFormatValue">{datetimeFormat}</div>
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

describe('DatetimeFormatSelect', () => {
  it('stores the selected format value', async () => {
    const { getByTestId } = renderComponent();

    const combo = getByTestId('createDatasetSettingsDatetimeFormat');
    const input = combo.querySelector('input');
    expect(input).not.toBeNull();

    await act(async () => {
      fireEvent.change(input as HTMLInputElement, {
        target: { value: 'strict_date_optional_time' },
      });
      fireEvent.keyDown(input as HTMLInputElement, { key: 'Enter', code: 'Enter' });
    });

    expect(getByTestId('datetimeFormatValue')).toHaveTextContent('strict_date_optional_time');
  });
});
