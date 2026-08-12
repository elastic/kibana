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

const openAdvanced = (getByTestId: ReturnType<typeof render>['getByTestId']) =>
  fireEvent.click(getByTestId('createDatasetFlyoutAdvancedSettingsToggle'));

describe('CreateDatasetFlyoutSettings', () => {
  it('shows the format select at the top level without opening anything', () => {
    const { getByTestId } = renderSettings();
    expect(getByTestId('createDatasetFlyoutSettingsFormat')).toBeVisible();
  });

  it('hides the advanced section by default and shows it when toggled', () => {
    const { getByTestId } = renderSettings();

    const toggle = getByTestId('createDatasetFlyoutAdvancedSettingsToggle');
    const partitionDetection = getByTestId('createDatasetFlyoutSettingsPartitionDetection');

    expect(partitionDetection).not.toBeVisible();
    fireEvent.click(toggle);
    expect(partitionDetection).toBeVisible();
  });

  it('updates format in form state', () => {
    const { getByTestId } = renderSettings();

    fireEvent.change(getByTestId('createDatasetFlyoutSettingsFormat'), {
      target: { value: 'parquet' },
    });

    expect(getSettingsValue(getByTestId)).toMatchObject({ format: 'parquet' });
  });

  it('updates partition_detection in form state', () => {
    const { getByTestId } = renderSettings();

    openAdvanced(getByTestId);
    fireEvent.change(getByTestId('createDatasetFlyoutSettingsPartitionDetection'), {
      target: { value: 'hive' },
    });

    expect(getSettingsValue(getByTestId)).toMatchObject({ partition_detection: 'hive' });
  });

  it('shows schema_resolution and hive_partitioning in the advanced section', () => {
    const { getByTestId } = renderSettings();
    openAdvanced(getByTestId);

    expect(getByTestId('createDatasetFlyoutSettingsSchemaResolution')).toBeVisible();
    expect(getByTestId('createDatasetFlyoutSettingsHivePartitioning')).toBeVisible();
  });

  it('shows no format-specific fields when no format is selected', () => {
    const { queryByTestId } = renderSettings();
    // format-specific fields are not in the DOM until a format is chosen
    expect(queryByTestId('createDatasetFlyoutSettingsSchemaSampleSize')).toBeNull();
    // API-only fields are never in the DOM
    expect(queryByTestId('createDatasetFlyoutSettingsOptimizedReader')).toBeNull();
    expect(queryByTestId('createDatasetFlyoutSettingsSegmentSize')).toBeNull();
  });

  describe('CSV format', () => {
    it('shows delimiter, mode, and header_row at the top level (core)', () => {
      const { getByTestId } = renderSettings();

      fireEvent.change(getByTestId('createDatasetFlyoutSettingsFormat'), {
        target: { value: 'csv' },
      });

      // Core fields visible without opening the expander
      expect(getByTestId('createDatasetFlyoutSettingsDelimiter')).toBeVisible();
      expect(getByTestId('createDatasetFlyoutSettingsMode')).toBeVisible();
      expect(getByTestId('createDatasetFlyoutSettingsHeaderRow')).toBeVisible();
    });

    it('shows CSV advanced fields inside the advanced section', () => {
      const { getByTestId } = renderSettings();

      fireEvent.change(getByTestId('createDatasetFlyoutSettingsFormat'), {
        target: { value: 'csv' },
      });
      openAdvanced(getByTestId);

      expect(getByTestId('createDatasetFlyoutSettingsSchemaSampleSize')).toBeVisible();
      expect(getByTestId('createDatasetFlyoutSettingsMaxErrors')).toBeVisible();
      expect(getByTestId('createDatasetFlyoutSettingsNullValue')).toBeVisible();
    });

    it('updates a CSV core field in form state', () => {
      const { getByTestId } = renderSettings();

      fireEvent.change(getByTestId('createDatasetFlyoutSettingsFormat'), {
        target: { value: 'csv' },
      });
      fireEvent.change(getByTestId('createDatasetFlyoutSettingsDelimiter'), {
        target: { value: '|' },
      });

      expect(getSettingsValue(getByTestId)).toMatchObject({ delimiter: '|' });
    });
  });

  describe('NDJSON format', () => {
    it('shows schema_sample_size and datetime_format inside the advanced section', () => {
      const { getByTestId } = renderSettings();

      fireEvent.change(getByTestId('createDatasetFlyoutSettingsFormat'), {
        target: { value: 'ndjson' },
      });
      openAdvanced(getByTestId);

      expect(getByTestId('createDatasetFlyoutSettingsSchemaSampleSize')).toBeVisible();
      expect(getByTestId('createDatasetFlyoutSettingsDatetimeFormat')).toBeVisible();
    });

    it('does not show segment_size (API-only)', () => {
      const { queryByTestId } = renderSettings();

      fireEvent.change(queryByTestId('createDatasetFlyoutSettingsFormat')!, {
        target: { value: 'ndjson' },
      });

      expect(queryByTestId('createDatasetFlyoutSettingsSegmentSize')).toBeNull();
    });
  });

  describe('Parquet format', () => {
    it('shows no format-specific fields for parquet (all API-only)', () => {
      const { queryByTestId } = renderSettings();

      fireEvent.change(queryByTestId('createDatasetFlyoutSettingsFormat')!, {
        target: { value: 'parquet' },
      });

      expect(queryByTestId('createDatasetFlyoutSettingsOptimizedReader')).toBeNull();
      expect(queryByTestId('createDatasetFlyoutSettingsLateMaterialization')).toBeNull();
    });
  });
});
