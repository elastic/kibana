/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import { isCsvQuotingEnabled, type DataSetWithName } from '../../common';
import type { DatasetFormat, DatasetSettingsFile } from '../../common/dataset_types';
import { buildDatasetMappings } from './mapping_step/mapping_editor';
import {
  buildDatasetSettingsFromFormValues,
  DEFAULT_SCHEMA_RESOLUTION,
  type CreateDatasetFormValues,
} from './create_dataset_form_state';

const CSV_TSV_SETTING_KEYS: readonly string[] = [
  'delimiter',
  'mode',
  'quote',
  'escape',
  'comment',
  'null_value',
  'encoding',
  'datetime_format',
  'max_field_size',
  'multi_value_syntax',
  'header_row',
  'column_prefix',
  'trim_spaces',
  'schema_sample_size',
  'skip_rows',
];

/** Settings Elasticsearch accepts only for the listed formats; every other setting applies to all formats. */
const FORMAT_SPECIFIC_SETTING_KEYS: Readonly<Record<DatasetFormat, readonly string[]>> = {
  csv: CSV_TSV_SETTING_KEYS,
  tsv: CSV_TSV_SETTING_KEYS,
  ndjson: ['schema_sample_size', 'segment_size', 'datetime_format'],
  parquet: [],
};

const ALL_FORMAT_SPECIFIC_SETTING_KEYS = new Set(
  Object.values(FORMAT_SPECIFIC_SETTING_KEYS).flat()
);

const FILE_ORDER_SETTING_KEYS: readonly string[] = ['file_sort_by', 'file_order'];

const isSettingSupportedForFormat = (key: string, format: DatasetFormat | undefined): boolean =>
  !ALL_FORMAT_SPECIFIC_SETTING_KEYS.has(key) ||
  (format !== undefined && FORMAT_SPECIFIC_SETTING_KEYS[format].includes(key));

const isUnmanagedSettingCompatible = (
  key: string,
  value: SerializableRecord[string],
  appliedSettings: DatasetSettingsFile
): boolean => {
  const { format, mode, quote, schema_resolution: schemaResolution } = appliedSettings;
  if (!isSettingSupportedForFormat(key, format)) return false;
  if (FILE_ORDER_SETTING_KEYS.includes(key)) {
    return !schemaResolution || schemaResolution === DEFAULT_SCHEMA_RESOLUTION;
  }
  if (key === 'multi_value_syntax' && value === 'brackets') {
    return isCsvQuotingEnabled({ format, mode, quote, multi_value_syntax: value });
  }
  return true;
};

/** Keeps the unmanaged settings Elasticsearch would accept alongside the settings managed by the form. */
const getCompatibleUnmanagedSettings = (
  unmanagedSettings: SerializableRecord,
  appliedSettings: DatasetSettingsFile
): SerializableRecord =>
  Object.fromEntries(
    Object.entries(unmanagedSettings).filter(([key, value]) =>
      isUnmanagedSettingCompatible(key, value, appliedSettings)
    )
  );

export const buildDatasetPayload = (values: CreateDatasetFormValues): DataSetWithName => {
  const description = values.description?.trim();
  const appliedSettings = buildDatasetSettingsFromFormValues(values.settings) ?? {};
  const unmanagedSettings = getCompatibleUnmanagedSettings(
    values.ui.unmanagedSettings ?? {},
    appliedSettings
  );
  const settings =
    Object.keys(unmanagedSettings).length > 0
      ? { ...appliedSettings, ...unmanagedSettings }
      : Object.keys(appliedSettings).length > 0
      ? appliedSettings
      : undefined;
  const mappings = buildDatasetMappings(values.mappings);

  return {
    name: values.name.trim(),
    data_source: values.data_source.trim(),
    resource: values.resource.trim(),
    ...(description ? { description } : {}),
    ...(settings ? { settings } : {}),
    ...(mappings ? { mappings } : {}),
  };
};
