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
    case 'tsv': {
      const prefix = settings.column_prefix.trim() || 'col';
      return Array.from({ length: TEST_CONFIGURATION_PREVIEW_MIN_COLUMN_COUNT }, (_, index) => ({
        name: `${prefix}${index + 1}`,
        type: 'keyword',
      }));
    }
    case 'ndjson':
    case 'parquet':
    case 'orc':
      return STRUCTURED_FORMAT_FIELDS;
    default:
      return Array.from({ length: TEST_CONFIGURATION_PREVIEW_MIN_COLUMN_COUNT }, (_, index) => ({
        name: `field_${index + 1}`,
        type: 'keyword',
      }));
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

const mockValueForField = (
  field: TestConfigurationPreviewField,
  rowIndex: number
): string | number | boolean => {
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
    normalizedType === 'double' ||
    normalizedType === 'float' ||
    normalizedType === 'scaled_float' ||
    fieldName.includes('count') ||
    fieldName.includes('bytes') ||
    fieldName.includes('size') ||
    fieldName.includes('duration') ||
    fieldName.includes('status_code') ||
    fieldName.endsWith('.pid')
  ) {
    return (rowIndex + 1) * 128;
  }

  if (normalizedType === 'boolean') {
    return rowIndex % 2 === 0;
  }

  if (fieldName === 'level') {
    return ['info', 'warn', 'error', 'debug'][rowIndex % 4];
  }

  if (fieldName === 'message' || normalizedType === 'text') {
    return `Sample log event ${rowIndex + 1}`;
  }

  if (fieldName.includes('host')) {
    return `host-${rowIndex + 1}.example.com`;
  }

  if (fieldName.includes('service')) {
    return `service-${(rowIndex % 3) + 1}`;
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

  if (fieldName.includes('trace') || fieldName.includes('span') || fieldName.includes('id')) {
    return `trace-${rowIndex + 1}-abc123`;
  }

  if (fieldName.includes('user')) {
    return `user-${rowIndex + 1}`;
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
