/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSource } from '../../common';
import { getDataSetByIdApiPath } from '../../common';
import { applySettingsForFormat } from '../create_dataset_flyout/dataset_settings_defaults';
import { emptyCreateDatasetSettingsFormValues } from '../create_dataset_flyout/create_dataset_flyout_form_state';
import { DATASET_WIZARD_FLOW_VARIANT_2 } from './dataset_wizard_flow_variant';
import { emptyDatasetWizardFormValues } from './dataset_wizard_form_state';
import {
  buildDatasetPayloadFromWizardValues,
  buildDatasetRequestBody,
  buildDatasetRequestText,
  getReviewLogisticsRows,
  getReviewSchemaMappingRows,
  getReviewSettingsRows,
} from './review_step_utils';

const s3DataSource: DataSource = {
  name: 'obs-prod-s3',
  type: 's3',
  description: '',
  settings: {},
};

describe('review_step_utils', () => {
  it('builds the dataset payload from wizard values', () => {
    const values = {
      ...emptyDatasetWizardFormValues(),
      name: 'dataset-obs-prod-s3',
      data_source: 'obs-prod-s3',
      resource: 's3://obs-logs-prod/**/*.parquet',
      settings: applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'parquet'),
    };

    expect(buildDatasetPayloadFromWizardValues(values)).toEqual({
      name: 'dataset-obs-prod-s3',
      data_source: 'obs-prod-s3',
      resource: 's3://obs-logs-prod/**/*.parquet',
      settings: {
        format: 'parquet',
        partition_detection: 'auto',
        schema_resolution: 'union_by_name',
        hive_partitioning: false,
        optimized_reader: true,
        late_materialization: true,
      },
    });
  });

  it('builds the request body without the dataset name', () => {
    const values = {
      ...emptyDatasetWizardFormValues(),
      name: 'dataset-obs-prod-s3',
      data_source: 'obs-prod-s3',
      resource: 's3://obs-logs-prod/**/*.parquet',
      settings: applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'csv'),
    };

    expect(buildDatasetRequestBody(values)).toEqual({
      data_source: 'obs-prod-s3',
      resource: 's3://obs-logs-prod/**/*.parquet',
      settings: {
        format: 'csv',
        partition_detection: 'auto',
        schema_resolution: 'union_by_name',
        hive_partitioning: false,
        delimiter: ',',
        mode: 'quoted',
        header_row: true,
        encoding: 'UTF-8',
        comment: '//',
        column_prefix: 'col',
        datetime_format: 'ISO-8601',
        multi_value_syntax: 'none',
        error_mode: 'fail_fast',
        max_field_size: 10485760,
        schema_sample_size: 20000,
      },
    });
  });

  it('builds a copyable request preview', () => {
    const values = {
      ...emptyDatasetWizardFormValues(),
      name: 'dataset-obs-prod-s3',
      data_source: 'obs-prod-s3',
      resource: 's3://obs-logs-prod/**/*.parquet',
      settings: applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'parquet'),
    };

    expect(buildDatasetRequestText(values)).toBe(
      `PUT ${getDataSetByIdApiPath('dataset-obs-prod-s3')}\n${JSON.stringify(
        buildDatasetRequestBody(values),
        null,
        2
      )}`
    );
  });

  it('returns logistics rows with data source type', () => {
    const values = {
      ...emptyDatasetWizardFormValues(),
      name: 'dataset-obs-prod-s3',
      data_source: 'obs-prod-s3',
      resource: 's3://obs-logs-prod/**/*.parquet',
      region: 'us-west-2',
    };

    const rows = getReviewLogisticsRows(values, [s3DataSource]);
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ displayValue: 'obs-prod-s3' }),
        expect.objectContaining({ displayValue: 'Amazon S3' }),
        expect.objectContaining({ displayValue: 'dataset-obs-prod-s3' }),
        expect.objectContaining({ displayValue: 'US West (Oregon)' }),
      ])
    );
  });

  it('marks format defaults and modified settings in summary rows', () => {
    const settings = {
      ...applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'csv'),
      error_mode: 'skip_row',
    };

    const rows = getReviewSettingsRows(settings, 's3://bucket/data.csv');
    const formatRow = rows.find((row) => row.displayValue === 'CSV');
    const delimiterRow = rows.find((row) => row.displayValue === 'Comma (,)');
    const errorModeRow = rows.find((row) => row.badge === 'modified' && row.displayValue !== 'CSV');

    expect(formatRow?.badge).toBeUndefined();
    expect(delimiterRow?.badge).toBe('default');
    expect(errorModeRow?.badge).toBe('modified');
  });

  it('marks format as modified when it differs from the auto-detected resource extension', () => {
    const settings = applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'parquet');

    const rows = getReviewSettingsRows(settings, 's3://bucket/data.csv');
    const formatRow = rows.find((row) => row.displayValue === 'Parquet');

    expect(formatRow?.badge).toBe('modified');
  });

  it('omits format badge when format matches auto-detected resource extension', () => {
    const settings = applySettingsForFormat(emptyCreateDatasetSettingsFormValues(), 'parquet');

    const rows = getReviewSettingsRows(settings, 's3://obs-logs-prod/**/*.parquet');
    const formatRow = rows.find((row) => row.displayValue === 'Parquet');

    expect(formatRow?.badge).toBeUndefined();
  });

  it('returns automatic schema mapping rows when inferred field types were modified', () => {
    const values = {
      ...emptyDatasetWizardFormValues(),
      schema_mapping_mode: 'automatic' as const,
      automatic_field_types: {
        '@timestamp': 'keyword',
        message: 'text',
      },
    };

    const rows = getReviewSchemaMappingRows(values, DATASET_WIZARD_FLOW_VARIANT_2);

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ displayValue: 'Infer from file', badge: 'default' }),
        expect.objectContaining({
          label: 'Manual changes',
          displayValue: '2 types',
          badge: 'modified',
        }),
      ])
    );
  });

  it('returns Glue schema mapping rows when AWS Glue table mode is selected', () => {
    const values = {
      ...emptyDatasetWizardFormValues(),
      schema_mapping_mode: 'aws_glue_table' as const,
      glue_database: 'security_logs',
      glue_table_name: 'cloudtrail_events',
      glue_catalog_region: '',
      glue_aws_account_id: '112233445566',
      region: 'us-west-2',
    };

    const rows = getReviewSchemaMappingRows(values, DATASET_WIZARD_FLOW_VARIANT_2);

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ displayValue: 'AWS Glue table', badge: 'modified' }),
        expect.objectContaining({ displayValue: 'security_logs', badge: 'modified' }),
        expect.objectContaining({ displayValue: 'cloudtrail_events', badge: 'modified' }),
        expect.objectContaining({ displayValue: 'us-west-2' }),
        expect.objectContaining({ displayValue: '112233445566', badge: 'modified' }),
      ])
    );
  });
});
