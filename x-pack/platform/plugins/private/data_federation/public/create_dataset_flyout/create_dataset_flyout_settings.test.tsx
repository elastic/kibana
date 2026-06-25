/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render } from '@testing-library/react';
import { useForm, useWatch } from 'react-hook-form';

import { CreateDatasetFlyoutSettings } from './create_dataset_flyout_settings';
import type { CreateDatasetFormValues } from './create_dataset_flyout_form_state';
import { emptyCreateDatasetSettingsFormValues } from './create_dataset_flyout_form_state';

const renderSettings = () => {
  const Wrapper = () => {
    const { control } = useForm<CreateDatasetFormValues>({
      defaultValues: {
        name: '',
        description: '',
        data_source: '',
        resource: '',
        settings: emptyCreateDatasetSettingsFormValues(),
      },
    });

    const settings = useWatch({ control, name: 'settings' });

    return (
      <EuiProvider>
        <CreateDatasetFlyoutSettings control={control} />
        <div data-test-subj="settingsValue">{JSON.stringify(settings)}</div>
      </EuiProvider>
    );
  };

  return render(<Wrapper />);
};

describe('CreateDatasetFlyoutSettings', () => {
  it('hides optional settings by default and shows them when toggled', () => {
    const { getByTestId } = renderSettings();

    const toggle = getByTestId('createDatasetFlyoutOptionalSettingsToggle');
    const errorMode = getByTestId('createDatasetFlyoutSettingsErrorMode');

    expect(errorMode).not.toBeVisible();
    fireEvent.click(toggle);
    expect(errorMode).toBeVisible();
  });

  it('updates form state when selecting options', () => {
    const { getByTestId } = renderSettings();

    fireEvent.click(getByTestId('createDatasetFlyoutOptionalSettingsToggle'));

    fireEvent.change(getByTestId('createDatasetFlyoutSettingsErrorMode'), {
      target: { value: 'skip_row' },
    });
    fireEvent.change(getByTestId('createDatasetFlyoutSettingsPartitionDetection'), {
      target: { value: 'hive' },
    });

    expect(getByTestId('settingsValue')).toHaveTextContent(
      JSON.stringify({
        error_mode: 'skip_row',
        partition_detection: 'hive',
        schema_sample_size: '',
      })
    );
  });
});
