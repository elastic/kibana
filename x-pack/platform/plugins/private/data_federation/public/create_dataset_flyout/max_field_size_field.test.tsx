/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render } from '@testing-library/react';
import { useForm } from 'react-hook-form';

import type { CreateDatasetFormValues } from './create_dataset_flyout_form_state';
import { emptyCreateDatasetSettingsFormValues } from './create_dataset_flyout_form_state';
import { MaxFieldSizeField } from './max_field_size_field';

const TestHarness = ({
  defaultMaxFieldSize = '10485760',
}: {
  defaultMaxFieldSize?: string;
}) => {
  const { control, watch } = useForm<CreateDatasetFormValues>({
    defaultValues: {
      name: '',
      description: '',
      data_source: '',
      resource: '',
      settings: {
        ...emptyCreateDatasetSettingsFormValues(),
        max_field_size: defaultMaxFieldSize,
      },
    },
  });

  return (
    <EuiProvider>
      <MaxFieldSizeField control={control} testSubjPrefix="datasetWizard" />
      <span data-test-subj="maxFieldSizeValue">{watch('settings.max_field_size')}</span>
    </EuiProvider>
  );
};

describe('MaxFieldSizeField', () => {
  it('shows the stored value using a readable unit', () => {
    const { getByTestId } = render(<TestHarness />);

    expect(getByTestId('datasetWizardSettingsMaxFieldSize')).toHaveValue(10);
    expect(getByTestId('datasetWizardSettingsMaxFieldSizeUnit')).toHaveTextContent('MB');
    expect(getByTestId('maxFieldSizeValue')).toHaveTextContent('10485760');
  });

  it('updates stored bytes when the display value changes', () => {
    const { getByTestId } = render(<TestHarness />);

    fireEvent.change(getByTestId('datasetWizardSettingsMaxFieldSize'), {
      target: { value: '1' },
    });

    expect(getByTestId('maxFieldSizeValue')).toHaveTextContent('1048576');
  });

  it('keeps the same byte value when switching units', () => {
    const { getByTestId } = render(<TestHarness />);

    fireEvent.click(getByTestId('datasetWizardSettingsMaxFieldSizeUnit'));
    fireEvent.click(getByTestId('datasetWizardSettingsMaxFieldSizeUnit-option-kb'));

    expect(getByTestId('datasetWizardSettingsMaxFieldSize')).toHaveValue(10240);
    expect(getByTestId('maxFieldSizeValue')).toHaveTextContent('10485760');
  });
});
