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
import { MaxErrorsField } from './max_errors_field';

const renderField = () => {
  const Wrapper = () => {
    const methods = useForm<CreateDatasetFormValues>({
      defaultValues: emptyDatasetFormValues(),
    });

    const maxErrors = useWatch({ control: methods.control, name: 'settings.max_errors' });

    return (
      <FormProvider {...methods}>
        <MaxErrorsField control={methods.control} />
        <div data-test-subj="maxErrorsValue">{maxErrors}</div>
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

describe('MaxErrorsField', () => {
  it('allows empty and whole numbers from 0, rejects negative and fractional numbers', () => {
    const { getByTestId, queryByText, getByText } = renderField();
    const input = getByTestId('createDatasetSettingsMaxErrors');

    // Empty is allowed
    expect(queryByText(createDatasetWizardStrings.settingsMaxErrorsInvalid)).toBeNull();

    fireEvent.change(input, { target: { value: '0' } });
    expect(getByTestId('maxErrorsValue')).toHaveTextContent('0');
    expect(queryByText(createDatasetWizardStrings.settingsMaxErrorsInvalid)).toBeNull();
    expect(input).not.toHaveAttribute('aria-invalid', 'true');

    fireEvent.change(input, { target: { value: '-1' } });
    expect(getByText(createDatasetWizardStrings.settingsMaxErrorsInvalid)).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'true');

    fireEvent.change(input, { target: { value: '1.5' } });
    expect(getByText(createDatasetWizardStrings.settingsMaxErrorsInvalid)).toBeInTheDocument();

    fireEvent.change(input, { target: { value: '5' } });
    expect(getByTestId('maxErrorsValue')).toHaveTextContent('5');
    expect(queryByText(createDatasetWizardStrings.settingsMaxErrorsInvalid)).toBeNull();
    expect(input).not.toHaveAttribute('aria-invalid', 'true');

    fireEvent.change(input, { target: { value: '' } });
    expect(getByTestId('maxErrorsValue')).toHaveTextContent('');
    expect(queryByText(createDatasetWizardStrings.settingsMaxErrorsInvalid)).toBeNull();
  });
});
