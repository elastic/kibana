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

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { CreateDatasetSettings } from './create_dataset_settings';
import type { CreateDatasetFormValues } from './create_dataset_form_state';
import { emptyCreateDatasetSettingsFormValues } from './create_dataset_form_state';

const docLinksMock = {
  links: {
    dataFederation: {
      overview: '',
      quickstart: '',
      dataSources: '',
      datasets: '',
      datasetSettings: '',
      authentication: '',
      staticCredentials: '',
      federatedIdentity: '',
      querying: '',
      security: '',
    },
  },
};

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
        <KibanaContextProvider services={{ docLinks: docLinksMock }}>
          <CreateDatasetSettings control={control} />
          <div data-test-subj="settingsValue">{JSON.stringify(settings)}</div>
        </KibanaContextProvider>
      </EuiProvider>
    );
  };

  return render(<Wrapper />);
};

const getSettingsValue = (getByTestId: ReturnType<typeof render>['getByTestId']) =>
  JSON.parse(getByTestId('settingsValue').textContent ?? '{}');

describe('CreateDatasetSettings', () => {
  const selectFormat = (getByTestId: ReturnType<typeof render>['getByTestId'], format: string) => {
    fireEvent.click(getByTestId('createDatasetSettingsFormat'));
    fireEvent.click(getByTestId(`createDatasetSettingsFormatOption-${format}`));
  };

  it('shows the format select', () => {
    const { getByTestId } = renderSettings();
    expect(getByTestId('createDatasetSettingsFormat')).toBeVisible();
  });

  it('shows additional settings without a hide/show toggle', () => {
    const { getByTestId, queryByTestId } = renderSettings();

    expect(queryByTestId('createDatasetAdditionalSettingsToggle')).toBeNull();
    expect(getByTestId('createDatasetSettingsPartitionDetection')).toBeVisible();
  });

  it('updates format in form state', () => {
    const { getByTestId } = renderSettings();

    selectFormat(getByTestId, 'parquet');

    expect(getSettingsValue(getByTestId)).toMatchObject({ format: 'parquet' });
  });

  it('updates partition_detection in form state', () => {
    const { getByTestId } = renderSettings();

    fireEvent.change(getByTestId('createDatasetSettingsPartitionDetection'), {
      target: { value: 'hive' },
    });

    expect(getSettingsValue(getByTestId)).toMatchObject({ partition_detection: 'hive' });
  });

  it('shows schema_resolution and hive_partitioning', () => {
    const { getByTestId } = renderSettings();

    expect(getByTestId('createDatasetSettingsSchemaResolution')).toBeVisible();
    expect(getByTestId('createDatasetSettingsHivePartitioning')).toBeVisible();
  });

  it('shows no format-specific fields when no format is selected', () => {
    const { queryByTestId } = renderSettings();
    // format-specific fields are not in the DOM until a format is chosen
    expect(queryByTestId('createDatasetSettingsSchemaSampleSize')).toBeNull();
    // API-only fields are never in the DOM
    expect(queryByTestId('createDatasetSettingsOptimizedReader')).toBeNull();
    expect(queryByTestId('createDatasetSettingsSegmentSize')).toBeNull();
  });

  describe('CSV format', () => {
    it('shows delimiter, mode, and header_row at the top level (core)', () => {
      const { getByTestId } = renderSettings();

      selectFormat(getByTestId, 'csv');

      expect(getByTestId('createDatasetSettingsDelimiter')).toBeVisible();
      expect(getByTestId('createDatasetSettingsMode')).toBeVisible();
      expect(getByTestId('createDatasetSettingsHeaderRow')).toBeVisible();
    });

    it('shows CSV advanced fields when CSV is selected', () => {
      const { getByTestId } = renderSettings();

      selectFormat(getByTestId, 'csv');

      expect(getByTestId('createDatasetSettingsSchemaSampleSize')).toBeVisible();
      expect(getByTestId('createDatasetSettingsMaxErrors')).toBeVisible();
      expect(getByTestId('createDatasetSettingsNullValue')).toBeVisible();
    });

    it('updates a CSV core field in form state', () => {
      const { getByTestId } = renderSettings();

      selectFormat(getByTestId, 'csv');
      fireEvent.change(getByTestId('createDatasetSettingsDelimiter'), {
        target: { value: '|' },
      });

      expect(getSettingsValue(getByTestId)).toMatchObject({ delimiter: '|' });
    });
  });

  describe('NDJSON format', () => {
    it('shows schema_sample_size and datetime_format when NDJSON is selected', () => {
      const { getByTestId } = renderSettings();

      selectFormat(getByTestId, 'ndjson');

      expect(getByTestId('createDatasetSettingsSchemaSampleSize')).toBeVisible();
      expect(getByTestId('createDatasetSettingsDatetimeFormat')).toBeVisible();
    });

    it('does not show segment_size (API-only)', () => {
      const { queryByTestId, getByTestId } = renderSettings();
      selectFormat(getByTestId, 'ndjson');

      expect(queryByTestId('createDatasetSettingsSegmentSize')).toBeNull();
    });
  });

  describe('Parquet format', () => {
    it('shows no format-specific fields for parquet (all API-only)', () => {
      const { queryByTestId, getByTestId } = renderSettings();
      selectFormat(getByTestId, 'parquet');

      expect(queryByTestId('createDatasetSettingsOptimizedReader')).toBeNull();
      expect(queryByTestId('createDatasetSettingsLateMaterialization')).toBeNull();
    });
  });
});
