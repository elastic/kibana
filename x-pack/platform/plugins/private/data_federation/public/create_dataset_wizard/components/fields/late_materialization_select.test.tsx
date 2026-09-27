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
import { LateMaterializationSelect } from './late_materialization_select';

const renderComponent = () => {
  const Wrapper = () => {
    const methods = useForm<CreateDatasetFormValues>({
      defaultValues: emptyDatasetFormValues(),
    });

    const value = useWatch({ control: methods.control, name: 'settings.late_materialization' });

    return (
      <FormProvider {...methods}>
        <LateMaterializationSelect control={methods.control} />
        <div data-test-subj="lateMaterializationValue">{value}</div>
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

describe('LateMaterializationSelect', () => {
  it('updates form state when an option is selected', async () => {
    const { getByTestId } = renderComponent();

    await act(async () => {
      fireEvent.click(getByTestId('createDatasetSettingsLateMaterialization'));
    });

    await act(async () => {
      fireEvent.click(getByTestId('createDatasetSettingsLateMaterializationOption-false'));
    });

    expect(getByTestId('lateMaterializationValue')).toHaveTextContent('false');
  });
});

