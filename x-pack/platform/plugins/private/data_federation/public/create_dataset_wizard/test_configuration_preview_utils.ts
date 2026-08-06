/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateDatasetSettingsFormValues } from '../create_dataset_flyout/create_dataset_flyout_form_state';
import type { DatasetWizardFormValues } from './dataset_wizard_form_state';

export const TEST_CONFIGURATION_PREVIEW_ROW_COUNT = 10;
export const TEST_CONFIGURATION_PREVIEW_MIN_COLUMN_COUNT = 12;

export interface TestConfigurationPreviewField {
  name: string;
  type?: string;
}

export type TestConfigurationPreviewRow = Record<string, string | number | boolean> & {
  id: string;
};

const STRUCTURED_FORMAT_FIELDS: TestConfigurationPreviewField[] = [
  { name: '@timestamp', type: 'date' },
  { name: 'message', type: 'text' },
  { name: 'level', type: 'keyword' },
  { name: 'host.name', type: 'keyword' },
  { name: 'service.name', type: 'keyword' },
  { name: 'trace.id', type: 'keyword' },
  { name: 'span.id', type: 'keyword' },
  { name: 'http.response.status_code', type: 'long' },
  { name: 'event.duration', type: 'long' },
  { name: 'user.name', type: 'keyword' },
  { name: 'cloud.region', type: 'keyword' },
  { name: 'error.type', type: 'keyword' },
  { name: 'log.file.path', type: 'keyword' },
  { name: 'process.pid', type: 'long' },
];

const CSV_HEADER_ROW_FIELDS: TestConfigurationPreviewField[] = [
  { name: 'timestamp', type: 'date' },
  { name: 'message', type: 'text' },
  { name: 'level', type: 'keyword' },
  { name: 'host', type: 'keyword' },
  { name: 'service', type: 'keyword' },
  { name: 'status_code', type: 'long' },
  { name: 'duration_ms', type: 'long' },
  { name: 'user', type: 'keyword' },
  { name: 'region', type: 'keyword' },
  { name: 'error_type', type: 'keyword' },
  { name: 'log_path', type: 'keyword' },
  { name: 'process_pid', type: 'long' },
];

const NDJSON_FORMAT_FIELDS: TestConfigurationPreviewField[] = [
  { name: '@timestamp', type: 'date' },
  { name: 'message', type: 'text' },
  { name: 'log.level', type: 'keyword' },
  { name: 'host.name', type: 'keyword' },
  { name: 'service.name', type: 'keyword' },
  { name: 'trace.id', type: 'keyword' },
  { name: 'transaction.id', type: 'keyword' },
  { name: 'http.response.status_code', type: 'long' },
  { name: 'event.duration', type: 'long' },
  { name: 'user.name', type: 'keyword' },
  { name: 'cloud.region', type: 'keyword' },
  { name: 'error.message', type: 'text' },
  { name: 'process.pid', type: 'long' },
  { name: 'agent.version', type: 'keyword' },
];

const isCsvHeaderRowEnabled = (settings: CreateDatasetSettingsFormValues): boolean =>
  settings.header_row.trim().toLowerCase() !== 'false';

const getPrefixedColumnFields = (
  prefix: string,
  profiles: readonly TestConfigurationPreviewField[]
): TestConfigurationPreviewField[] =>
  Array.from({ length: TEST_CONFIGURATION_PREVIEW_MIN_COLUMN_COUNT }, (_, index) => {
    const profile = profiles[index % profiles.length];

    return {
      name: `${prefix}${index + 1}`,
      type: profile.type,
    };
  });

const extractManualMappingFields = (
  mappings: Record<string, object>
): TestConfigurationPreviewField[] => {
  const properties = mappings.properties;
  const source =
    properties && typeof properties === 'object'
      ? (properties as Record<string, { type?: string }>)
      : (mappings as Record<string, { type?: string }>);

  return Object.entries(source).map(([name, mapping]) => ({
    name,
    type: typeof mapping?.type === 'string' ? mapping.type : undefined,
  }));
};

const getFormatInferredFields = (
  settings: CreateDatasetSettingsFormValues
): TestConfigurationPreviewField[] => {
  switch (settings.format) {
    case 'csv':
    case 'tsv':
      if (isCsvHeaderRowEnabled(settings)) {
        return CSV_HEADER_ROW_FIELDS;
      }

      return getPrefixedColumnFields(
        settings.column_prefix.trim() || 'col',
        CSV_HEADER_ROW_FIELDS
      );
    case 'ndjson':
      return NDJSON_FORMAT_FIELDS;
    case 'parquet':
    case 'orc':
      return STRUCTURED_FORMAT_FIELDS;
    default:
      return STRUCTURED_FORMAT_FIELDS.slice(0, TEST_CONFIGURATION_PREVIEW_MIN_COLUMN_COUNT);
  }
};

const mergeManualAndInferredFields = (
  manualFields: TestConfigurationPreviewField[],
  settings: CreateDatasetSettingsFormValues
): TestConfigurationPreviewField[] => {
  const merged: TestConfigurationPreviewField[] = [...manualFields];
  const existingNames = new Set(manualFields.map((field) => field.name));

  for (const field of getFormatInferredFields(settings)) {
    if (existingNames.has(field.name)) {
      continue;
    }

    merged.push(field);
    existingNames.add(field.name);

    if (merged.length >= TEST_CONFIGURATION_PREVIEW_MIN_COLUMN_COUNT) {
      return merged;
    }
  }

  let padIndex = 1;
  while (merged.length < TEST_CONFIGURATION_PREVIEW_MIN_COLUMN_COUNT) {
    const name = `field_${padIndex}`;
    padIndex += 1;

    if (existingNames.has(name)) {
      continue;
    }

    merged.push({ name, type: 'keyword' });
    existingNames.add(name);
  }

  return merged;
};

export const getTestConfigurationPreviewFields = (
  values: DatasetWizardFormValues
): TestConfigurationPreviewField[] => {
  if (values.schema_mapping_mode === 'manual') {
    const manualFields = extractManualMappingFields(values.manual_mappings ?? {});
    if (manualFields.length > 0) {
      return mergeManualAndInferredFields(manualFields, values.settings);
    }
  }

  return getFormatInferredFields(values.settings);
};

const getPrefixedColumnSampleField = (
  field: TestConfigurationPreviewField
): TestConfigurationPreviewField | undefined => {
  const match = field.name.match(/(\d+)$/);
  if (!match) {
    return undefined;
  }

  const columnIndex = Number(match[1]) - 1;
  if (!Number.isInteger(columnIndex) || columnIndex < 0) {
    return undefined;
  }

  return CSV_HEADER_ROW_FIELDS[columnIndex % CSV_HEADER_ROW_FIELDS.length];
};

const mockValueForField = (
  field: TestConfigurationPreviewField,
  rowIndex: number
): string | number | boolean => {
  const prefixedColumnSample = getPrefixedColumnSampleField(field);
  if (prefixedColumnSample && prefixedColumnSample.name !== field.name) {
    return mockValueForField(
      {
        ...prefixedColumnSample,
        type: field.type ?? prefixedColumnSample.type,
      },
      rowIndex
    );
  }

  const normalizedType = field.type?.toLowerCase();
  const fieldName = field.name.toLowerCase();

  if (
    normalizedType === 'date' ||
    normalizedType === 'date_nanos' ||
    fieldName.includes('timestamp') ||
    fieldName.endsWith('_at')
  ) {
    return `2026-08-05T12:${String(rowIndex).padStart(2, '0')}:00.000Z`;
  }

  if (
    normalizedType === 'long' ||
    normalizedType === 'integer' ||
    normalizedType === 'short' ||
    fieldName.includes('status_code') ||
    fieldName.endsWith('.pid') ||
    fieldName.endsWith('_pid') ||
    fieldName === 'quantity'
  ) {
    if (fieldName.includes('status_code')) {
      return [200, 201, 404, 500][rowIndex % 4];
    }

    return (rowIndex + 1) * 128;
  }

  if (
    normalizedType === 'double' ||
    normalizedType === 'float' ||
    normalizedType === 'scaled_float' ||
    fieldName.includes('duration') ||
    fieldName.includes('price') ||
    fieldName.includes('total')
  ) {
    if (fieldName.includes('duration')) {
      return (rowIndex + 1) * 128;
    }

    return Number(((rowIndex + 1) * 12.5).toFixed(2));
  }

  if (normalizedType === 'boolean') {
    return rowIndex % 2 === 0;
  }

  if (fieldName === 'level' || fieldName === 'log.level') {
    return ['info', 'warn', 'error', 'debug'][rowIndex % 4];
  }

  if (fieldName === 'message' || fieldName === 'error.message' || normalizedType === 'text') {
    return rowIndex > 0 && rowIndex % 3 === 0
      ? `Completed checkout for order ${1000 + rowIndex}`
      : `Sample log event ${rowIndex + 1}`;
  }

  if (fieldName.includes('host')) {
    return `host-${rowIndex + 1}.example.com`;
  }

  if (fieldName.includes('service')) {
    return ['checkout-api', 'payments-api', 'catalog-api'][rowIndex % 3];
  }

  if (fieldName.includes('region')) {
    return ['us-west-1', 'eu-west-1', 'ap-southeast-1'][rowIndex % 3];
  }

  if (fieldName.includes('path')) {
    return `/var/log/app-${rowIndex + 1}.log`;
  }

  if (fieldName.includes('error')) {
    return ['NullPointerException', 'TimeoutError', 'ValidationError'][rowIndex % 3];
  }

  if (fieldName === 'trace.id' || fieldName === 'span.id' || fieldName === 'transaction.id') {
    return `${fieldName.split('.')[0]}-${rowIndex + 1}-abc123def456`;
  }

  if (fieldName === 'order_id') {
    return `ORD-${1000 + rowIndex}`;
  }

  if (fieldName === 'customer_id') {
    return `CUST-${5000 + rowIndex}`;
  }

  if (fieldName === 'product_name') {
    return ['Widget A', 'Widget B', 'Gadget C'][rowIndex % 3];
  }

  if (fieldName === 'category') {
    return ['Electronics', 'Home', 'Office'][rowIndex % 3];
  }

  if (fieldName === 'currency') {
    return ['USD', 'EUR', 'GBP'][rowIndex % 3];
  }

  if (fieldName === 'country') {
    return ['US', 'DE', 'JP'][rowIndex % 3];
  }

  if (fieldName === 'status') {
    return ['shipped', 'pending', 'delivered'][rowIndex % 3];
  }

  if (fieldName === 'channel') {
    return ['web', 'mobile', 'retail'][rowIndex % 3];
  }

  if (fieldName === 'campaign') {
    return ['spring-sale', 'retargeting', 'newsletter'][rowIndex % 3];
  }

  if (fieldName === 'source') {
    return ['organic', 'paid-search', 'email'][rowIndex % 3];
  }

  if (fieldName.includes('user')) {
    return `user-${rowIndex + 1}`;
  }

  if (fieldName === 'agent.version') {
    return `8.${rowIndex % 4}.0`;
  }

  return `${field.name}-value-${rowIndex + 1}`;
};

export const buildTestConfigurationPreviewRows = (
  fields: TestConfigurationPreviewField[],
  rowCount: number = TEST_CONFIGURATION_PREVIEW_ROW_COUNT
): TestConfigurationPreviewRow[] =>
  Array.from({ length: rowCount }, (_, rowIndex) => {
    const row: TestConfigurationPreviewRow = { id: String(rowIndex) };

    for (const field of fields) {
      row[field.name] = mockValueForField(field, rowIndex);
    }

    return row;
  });
