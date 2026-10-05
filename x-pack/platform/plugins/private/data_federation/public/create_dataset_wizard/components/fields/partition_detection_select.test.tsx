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
import { PartitionDetectionSelect } from './partition_detection_select';

const renderComponent = () => {
  const Wrapper = () => {
    const methods = useForm<CreateDatasetFormValues>({
      defaultValues: emptyDatasetFormValues(),
    });

    const value = useWatch({ control: methods.control, name: 'settings.partition_detection' });

    return (
      <FormProvider {...methods}>
        <PartitionDetectionSelect control={methods.control} />
        <div data-test-subj="partitionDetectionValue">{value}</div>
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

describe('PartitionDetectionSelect', () => {
  it('updates form state when an option is selected', async () => {
    const { getByTestId, getAllByTestId } = renderComponent();

    const combo = getByTestId('createDatasetSettingsPartitionDetection');
    await act(async () => {
      fireEvent.click(combo.querySelector('input') ?? combo);
    });

    const candidates = getAllByTestId('createDatasetSettingsPartitionDetectionOption-template');
    const option = candidates.find((el) => el.getAttribute('role') === 'option') ?? candidates[0];

    await act(async () => {
      fireEvent.click(option);
    });

    expect(getByTestId('partitionDetectionValue')).toHaveTextContent('template');
  });
});
