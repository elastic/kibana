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

const openOptional = (getByTestId: ReturnType<typeof render>['getByTestId']) =>
  fireEvent.click(getByTestId('createDatasetFlyoutOptionalSettingsToggle'));

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

    openOptional(getByTestId);
    fireEvent.change(getByTestId('createDatasetFlyoutSettingsPartitionDetection'), {
      target: { value: 'hive' },
    });

    expect(getSettingsValue(getByTestId)).toMatchObject({ partition_detection: 'hive' });
  });

  describe('Automatic format (default)', () => {
    it('shows all commonly-used fields directly', () => {
      const { getByTestId } = renderSettings();
      openOptional(getByTestId);

      expect(getByTestId('createDatasetFlyoutSettingsDelimiter')).toBeVisible();
      expect(getByTestId('createDatasetFlyoutSettingsMode')).toBeVisible();
      expect(getByTestId('createDatasetFlyoutSettingsHeaderRow')).toBeVisible();
      expect(getByTestId('createDatasetFlyoutSettingsNullValue')).toBeVisible();
      expect(getByTestId('createDatasetFlyoutSettingsEncoding')).toBeVisible();
      expect(getByTestId('createDatasetFlyoutSettingsSchemaSampleSize')).toBeVisible();
      expect(getByTestId('createDatasetFlyoutSettingsErrorMode')).toBeVisible();
    });

    it('hides advanced fields until the advanced toggle is clicked', () => {
      const { getByTestId } = renderSettings();
      openOptional(getByTestId);

      expect(getByTestId('createDatasetFlyoutSettingsMaxErrors')).not.toBeVisible();
      expect(getByTestId('createDatasetFlyoutSettingsSegmentSize')).not.toBeVisible();
      expect(getByTestId('createDatasetFlyoutSettingsOptimizedReader')).not.toBeVisible();
      expect(getByTestId('createDatasetFlyoutSettingsLateMaterialization')).not.toBeVisible();

      fireEvent.click(getByTestId('createDatasetFlyoutAllFormatsAdvancedToggle'));

      expect(getByTestId('createDatasetFlyoutSettingsMaxErrors')).toBeVisible();
      expect(getByTestId('createDatasetFlyoutSettingsSegmentSize')).toBeVisible();
      expect(getByTestId('createDatasetFlyoutSettingsOptimizedReader')).toBeVisible();
      expect(getByTestId('createDatasetFlyoutSettingsLateMaterialization')).toBeVisible();
    });

    it('updates a commonly-used field in form state', () => {
      const { getByTestId } = renderSettings();
      openOptional(getByTestId);

      fireEvent.change(getByTestId('createDatasetFlyoutSettingsDelimiter'), {
        target: { value: '|' },
      });

      expect(getSettingsValue(getByTestId)).toMatchObject({ delimiter: '|' });
    });
  });

  describe('CSV format', () => {
    it('shows commonly-changed CSV fields directly', () => {
      const { getByTestId } = renderSettings();
      openOptional(getByTestId);
      fireEvent.change(getByTestId('createDatasetFlyoutSettingsFormat'), {
        target: { value: 'csv' },
      });

      expect(getByTestId('createDatasetFlyoutSettingsDelimiter')).toBeVisible();
      expect(getByTestId('createDatasetFlyoutSettingsMode')).toBeVisible();
      expect(getByTestId('createDatasetFlyoutSettingsHeaderRow')).toBeVisible();
    });

    it('hides schema_sample_size behind the CSV advanced toggle', () => {
      const { getByTestId } = renderSettings();
      openOptional(getByTestId);
      fireEvent.change(getByTestId('createDatasetFlyoutSettingsFormat'), {
        target: { value: 'csv' },
      });

      expect(getByTestId('createDatasetFlyoutSettingsSchemaSampleSize')).not.toBeVisible();

      fireEvent.click(getByTestId('createDatasetFlyoutCsvAdvancedToggle'));

      expect(getByTestId('createDatasetFlyoutSettingsSchemaSampleSize')).toBeVisible();
    });
  });

  describe('NDJSON format', () => {
    it('shows schema_sample_size directly for NDJSON', () => {
      const { getByTestId } = renderSettings();
      openOptional(getByTestId);
      fireEvent.change(getByTestId('createDatasetFlyoutSettingsFormat'), {
        target: { value: 'ndjson' },
      });

      expect(getByTestId('createDatasetFlyoutSettingsSchemaSampleSize')).toBeVisible();
    });

    it('hides segment_size behind the NDJSON advanced toggle', () => {
      const { getByTestId } = renderSettings();
      openOptional(getByTestId);
      fireEvent.change(getByTestId('createDatasetFlyoutSettingsFormat'), {
        target: { value: 'ndjson' },
      });

      expect(getByTestId('createDatasetFlyoutSettingsSegmentSize')).not.toBeVisible();

      fireEvent.click(getByTestId('createDatasetFlyoutNdjsonAdvancedToggle'));

      expect(getByTestId('createDatasetFlyoutSettingsSegmentSize')).toBeVisible();
    });
  });

  describe('Parquet format', () => {
    it('hides optimized_reader and late_materialization behind the Parquet advanced toggle', () => {
      const { getByTestId } = renderSettings();
      openOptional(getByTestId);
      fireEvent.change(getByTestId('createDatasetFlyoutSettingsFormat'), {
        target: { value: 'parquet' },
      });

      expect(getByTestId('createDatasetFlyoutSettingsOptimizedReader')).not.toBeVisible();
      expect(getByTestId('createDatasetFlyoutSettingsLateMaterialization')).not.toBeVisible();

      fireEvent.click(getByTestId('createDatasetFlyoutParquetAdvancedToggle'));

      expect(getByTestId('createDatasetFlyoutSettingsOptimizedReader')).toBeVisible();
      expect(getByTestId('createDatasetFlyoutSettingsLateMaterialization')).toBeVisible();
    });
  });

  it('updates format in form state', () => {
    const { getByTestId } = renderSettings();
    openOptional(getByTestId);

    fireEvent.change(getByTestId('createDatasetFlyoutSettingsFormat'), {
      target: { value: 'parquet' },
    });

    expect(getSettingsValue(getByTestId)).toMatchObject({ format: 'parquet' });
  });
});
