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

const getSettingsValue = (getByTestId: ReturnType<typeof render>['getByTestId']) =>
  JSON.parse(getByTestId('settingsValue').textContent ?? '{}');

describe('CreateDatasetFlyoutSettings', () => {
  it('hides optional settings by default and shows them when toggled', () => {
    const { getByTestId } = renderSettings();

    const toggle = getByTestId('createDatasetFlyoutOptionalSettingsToggle');
    const partitionDetection = getByTestId('createDatasetFlyoutSettingsPartitionDetection');

    expect(partitionDetection).not.toBeVisible();
    fireEvent.click(toggle);
    expect(partitionDetection).toBeVisible();
  });

  it('updates partition_detection in form state', () => {
    const { getByTestId } = renderSettings();

    fireEvent.click(getByTestId('createDatasetFlyoutOptionalSettingsToggle'));
    fireEvent.change(getByTestId('createDatasetFlyoutSettingsPartitionDetection'), {
      target: { value: 'hive' },
    });

    expect(getSettingsValue(getByTestId)).toMatchObject({ partition_detection: 'hive' });
  });

  it('shows error_mode and schema_sample_size in generic (auto) format view', () => {
    const { getByTestId } = renderSettings();

    fireEvent.click(getByTestId('createDatasetFlyoutOptionalSettingsToggle'));

    expect(getByTestId('createDatasetFlyoutSettingsErrorMode')).toBeVisible();
    expect(getByTestId('createDatasetFlyoutSettingsSchemaSampleSize')).toBeVisible();
  });

  it('shows CSV-specific fields when format is set to csv', () => {
    const { getByTestId } = renderSettings();

    fireEvent.click(getByTestId('createDatasetFlyoutOptionalSettingsToggle'));
    fireEvent.change(getByTestId('createDatasetFlyoutSettingsFormat'), {
      target: { value: 'csv' },
    });

    expect(getByTestId('createDatasetFlyoutSettingsDelimiter')).toBeVisible();
    expect(getByTestId('createDatasetFlyoutSettingsMode')).toBeVisible();
    expect(getByTestId('createDatasetFlyoutSettingsHeaderRow')).toBeVisible();
  });

  it('shows NDJSON schema_sample_size when format is ndjson', () => {
    const { getByTestId } = renderSettings();

    fireEvent.click(getByTestId('createDatasetFlyoutOptionalSettingsToggle'));
    fireEvent.change(getByTestId('createDatasetFlyoutSettingsFormat'), {
      target: { value: 'ndjson' },
    });

    expect(getByTestId('createDatasetFlyoutSettingsSchemaSampleSize')).toBeVisible();
  });

  it('updates format in form state', () => {
    const { getByTestId } = renderSettings();

    fireEvent.click(getByTestId('createDatasetFlyoutOptionalSettingsToggle'));
    fireEvent.change(getByTestId('createDatasetFlyoutSettingsFormat'), {
      target: { value: 'parquet' },
    });

    expect(getSettingsValue(getByTestId)).toMatchObject({ format: 'parquet' });
  });
});
