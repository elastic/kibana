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

import type { CreateDatasetFormValues } from '../../../create_dataset_form_state';
import { emptyDatasetFormValues } from '../../../dataset_form_initial_values';
import { EncodingSelect } from './encoding_select';

const renderComponent = () => {
  const Wrapper = () => {
    const methods = useForm<CreateDatasetFormValues>({
      defaultValues: emptyDatasetFormValues(),
    });

    const encoding = useWatch({ control: methods.control, name: 'settings.encoding' });

    return (
      <FormProvider {...methods}>
        <EncodingSelect control={methods.control} />
        <div data-test-subj="encodingValue">{encoding}</div>
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

describe('EncodingSelect', () => {
  it('sets encoding and trims whitespace', async () => {
    const { getByTestId } = renderComponent();

    const combo = getByTestId('createDatasetSettingsEncoding');
    const input = combo.querySelector('input');
    expect(input).not.toBeNull();

    await act(async () => {
      fireEvent.change(input as HTMLInputElement, { target: { value: ' UTF-16 ' } });
      fireEvent.keyDown(input as HTMLInputElement, { key: 'Enter', code: 'Enter' });
    });

    expect(getByTestId('encodingValue')).toHaveTextContent('UTF-16');
  });
});
