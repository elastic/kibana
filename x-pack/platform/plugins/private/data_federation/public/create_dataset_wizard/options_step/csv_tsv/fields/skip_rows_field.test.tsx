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
import { SkipRowsField } from './skip_rows_field';

const renderField = () => {
  const Wrapper = () => {
    const methods = useForm<CreateDatasetFormValues>({
      defaultValues: emptyDatasetFormValues(),
    });

    const skipRows = useWatch({ control: methods.control, name: 'settings.skip_rows' });

    return (
      <FormProvider {...methods}>
        <SkipRowsField control={methods.control} />
        <div data-test-subj="skipRowsValue">{skipRows}</div>
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

describe('SkipRowsField', () => {
  it('allows empty, enforces a whole number between 0 and 1000', () => {
    const { getByTestId, queryByText, getByText } = renderField();
    const input = getByTestId('createDatasetSettingsSkipRows');

    // Empty is allowed
    expect(queryByText(createDatasetWizardStrings.settingsSkipRowsInvalid)).toBeNull();

    fireEvent.change(input, { target: { value: '-1' } });
    expect(getByTestId('skipRowsValue')).toHaveTextContent('-1');
    expect(getByText(createDatasetWizardStrings.settingsSkipRowsInvalid)).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'true');

    fireEvent.change(input, { target: { value: '1001' } });
    expect(getByText(createDatasetWizardStrings.settingsSkipRowsInvalid)).toBeInTheDocument();

    fireEvent.change(input, { target: { value: '10.5' } });
    expect(getByText(createDatasetWizardStrings.settingsSkipRowsInvalid)).toBeInTheDocument();

    fireEvent.change(input, { target: { value: '0' } });
    expect(getByTestId('skipRowsValue')).toHaveTextContent('0');
    expect(queryByText(createDatasetWizardStrings.settingsSkipRowsInvalid)).toBeNull();
    expect(input).not.toHaveAttribute('aria-invalid', 'true');

    fireEvent.change(input, { target: { value: '1000' } });
    expect(getByTestId('skipRowsValue')).toHaveTextContent('1000');
    expect(queryByText(createDatasetWizardStrings.settingsSkipRowsInvalid)).toBeNull();

    fireEvent.change(input, { target: { value: '' } });
    expect(getByTestId('skipRowsValue')).toHaveTextContent('');
    expect(queryByText(createDatasetWizardStrings.settingsSkipRowsInvalid)).toBeNull();
  });
});
