/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render } from '@testing-library/react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { I18nProvider } from '@kbn/i18n-react';

import type { CreateDatasetFormValues } from '../../../create_dataset_form_state';
import { emptyDatasetFormValues } from '../../../dataset_form_initial_values';
import { createDatasetWizardStrings } from '../../../create_dataset_wizard_i18n';
import { MaxErrorRatioField } from './max_error_ratio_field';

const renderField = () => {
  const Wrapper = () => {
    const methods = useForm<CreateDatasetFormValues>({
      defaultValues: emptyDatasetFormValues(),
    });

    const ratio = useWatch({ control: methods.control, name: 'settings.max_error_ratio' });

    return (
      <FormProvider {...methods}>
        <MaxErrorRatioField control={methods.control} />
        <div data-test-subj="maxErrorRatioValue">{ratio}</div>
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

describe('MaxErrorRatioField', () => {
  it('allows empty, rejects values outside [0, 1], accepts values within range', () => {
    const { getByTestId, queryByText, getByText } = renderField();
    const input = getByTestId('createDatasetSettingsMaxErrorRatio');

    // Empty is allowed
    expect(queryByText(createDatasetWizardStrings.settingsMaxErrorRatioInvalid)).toBeNull();

    fireEvent.change(input, { target: { value: '-0.1' } });
    expect(getByTestId('maxErrorRatioValue')).toHaveTextContent('-0.1');
    expect(getByText(createDatasetWizardStrings.settingsMaxErrorRatioInvalid)).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'true');

    fireEvent.change(input, { target: { value: '1.1' } });
    expect(getByText(createDatasetWizardStrings.settingsMaxErrorRatioInvalid)).toBeInTheDocument();

    fireEvent.change(input, { target: { value: '0.5' } });
    expect(getByTestId('maxErrorRatioValue')).toHaveTextContent('0.5');
    expect(queryByText(createDatasetWizardStrings.settingsMaxErrorRatioInvalid)).toBeNull();
    expect(input).not.toHaveAttribute('aria-invalid', 'true');

    fireEvent.change(input, { target: { value: '' } });
    expect(getByTestId('maxErrorRatioValue')).toHaveTextContent('');
    expect(queryByText(createDatasetWizardStrings.settingsMaxErrorRatioInvalid)).toBeNull();
  });
});
