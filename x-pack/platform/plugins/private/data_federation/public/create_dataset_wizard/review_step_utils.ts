/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNil, omit, omitBy } from 'lodash';

import type { DataSetWithName, DataSource, Dataset } from '../../common';
import { getDataSetByIdApiPath } from '../../common';
import { getDataSourceTypeVerbose } from '../get_data_source_type_label';
import { buildDatasetSettingsFromFormValues } from '../create_dataset_flyout/create_dataset_flyout_form_state';
import { createDatasetFlyoutStrings } from '../create_dataset_flyout/create_dataset_flyout_i18n';
import { getDefaultSettingsForFormat } from '../create_dataset_flyout/dataset_settings_defaults';
import {
  DELIMITER_PRESETS,
  DATETIME_FORMAT_PRESETS,
  ENCODING_PRESETS,
  ERROR_MODE_SUPER_SELECT_OPTIONS,
  FORMAT_SUPER_SELECT_OPTIONS,
  HEADER_ROW_SUPER_SELECT_OPTIONS,
  HIVE_PARTITIONING_SUPER_SELECT_OPTIONS,
  MODE_SUPER_SELECT_OPTIONS,
  MULTI_VALUE_SYNTAX_SUPER_SELECT_OPTIONS,
  NULL_VALUE_PRESETS,
  OPTIMIZED_READER_SUPER_SELECT_OPTIONS,
  PARTITION_DETECTION_SUPER_SELECT_OPTIONS,
  PARTITION_PATH_PRESETS,
  SCHEMA_RESOLUTION_SUPER_SELECT_OPTIONS,
} from '../create_dataset_flyout/dataset_settings_options';
import type { DatasetSettingsFieldId } from '../create_dataset_flyout/dataset_settings_visibility';
import {
  DATASET_SETTINGS_FIELD_IDS,
  isFieldVisibleForErrorMode,
  isFieldVisibleForFormat,
} from '../create_dataset_flyout/dataset_settings_visibility';
import { getAwsRegionLabel } from './aws_regions';
import { datasetWizardStrings } from './dataset_wizard_i18n';
import type { DatasetWizardFormValues, SchemaMappingMode } from './dataset_wizard_form_state';
import { inferFormatFromResource } from './infer_format_from_resource';

export type ReviewSettingBadge = 'default' | 'modified';

export interface ReviewSummaryRow {
  label: string;
  displayValue: string;
  badge?: ReviewSettingBadge;
}

const omitEmptySettingsFields = (settings: object): Record<string, unknown> =>
  omitBy(settings as Record<string, unknown>, (value) => {
    if (value === undefined || value === null) {
      return true;
    }
    if (typeof value === 'string' && value.trim() === '') {
      return true;
    }
    return false;
  });

export const buildDatasetPayloadFromWizardValues = (
  values: DatasetWizardFormValues
): DataSetWithName => {
  const desc = values.description?.trim();
  const settings = buildDatasetSettingsFromFormValues(values.settings);

  return {
    name: values.name.trim(),
    data_source: values.data_source.trim(),
    resource: values.resource.trim(),
    ...(desc ? { description: desc } : {}),
    ...(settings ? { settings } : {}),
  };
};

export const buildDatasetRequestBody = (values: DatasetWizardFormValues): Dataset => {
  const payload = buildDatasetPayloadFromWizardValues(values);
  const withoutName = omit(payload, 'name');

  return omitBy(
    {
      ...withoutName,
      settings: payload.settings ? omitEmptySettingsFields(payload.settings as object) : undefined,
    },
    isNil
  ) as Dataset;
};

export const buildDatasetRequestText = (values: DatasetWizardFormValues): string => {
  const payload = buildDatasetPayloadFromWizardValues(values);
  const endpoint = `PUT ${getDataSetByIdApiPath(payload.name || '<datasetName>')}`;
  const body = JSON.stringify(buildDatasetRequestBody(values), null, 2);

  return `${endpoint}\n${body}`;
};

export const getDatasetSettingsFieldLabel = (fieldId: DatasetSettingsFieldId): string => {
  switch (fieldId) {
    case 'partition_detection':
      return createDatasetFlyoutStrings.settingsPartitionDetectionLabel();
    case 'partition_path':
      return createDatasetFlyoutStrings.settingsPartitionPathLabel();
    case 'schema_sample_size':
      return createDatasetFlyoutStrings.settingsSchemaSampleSizeLabel();
    case 'schema_resolution':
      return createDatasetFlyoutStrings.settingsSchemaResolutionLabel();
    case 'hive_partitioning':
      return createDatasetFlyoutStrings.settingsHivePartitioningLabel();
    case 'delimiter':
      return createDatasetFlyoutStrings.settingsDelimiterLabel();
    case 'mode':
      return createDatasetFlyoutStrings.settingsModeLabel();
    case 'quote':
      return createDatasetFlyoutStrings.settingsQuoteLabel();
    case 'escape':
      return createDatasetFlyoutStrings.settingsEscapeLabel();
    case 'comment':
      return createDatasetFlyoutStrings.settingsCommentLabel();
    case 'encoding':
      return createDatasetFlyoutStrings.settingsEncodingLabel();
    case 'header_row':
      return createDatasetFlyoutStrings.settingsHeaderRowLabel();
    case 'column_prefix':
      return createDatasetFlyoutStrings.settingsColumnPrefixLabel();
    case 'null_value':
      return createDatasetFlyoutStrings.settingsNullValueLabel();
    case 'datetime_format':
      return createDatasetFlyoutStrings.settingsDatetimeFormatLabel();
    case 'multi_value_syntax':
      return createDatasetFlyoutStrings.settingsMultiValueSyntaxLabel();
    case 'error_mode':
      return createDatasetFlyoutStrings.settingsErrorModeLabel();
    case 'max_errors':
      return createDatasetFlyoutStrings.settingsMaxErrorsLabel();
    case 'max_error_ratio':
      return createDatasetFlyoutStrings.settingsMaxErrorRatioLabel();
    case 'max_field_size':
      return createDatasetFlyoutStrings.settingsMaxFieldSizeLabel();
    case 'segment_size':
      return createDatasetFlyoutStrings.settingsSegmentSizeLabel();
    case 'optimized_reader':
      return createDatasetFlyoutStrings.settingsOptimizedReaderLabel();
    case 'late_materialization':
      return createDatasetFlyoutStrings.settingsLateMaterializationLabel();
  }
};

const lookupOptionLabel = <T extends string>(
  value: string,
  options: Array<{ value: T; label: string }>
): string | undefined => options.find((option) => option.value === value)?.label;

const lookupPresetLabel = (value: string, presets: Array<{ value: string; label: string }>): string =>
  presets.find((preset) => preset.value === value)?.label ?? value;

export const formatSettingsFieldDisplayValue = (
  fieldId: DatasetSettingsFieldId,
  value: string
): string => {
  switch (fieldId) {
    case 'partition_detection':
      return (
        lookupOptionLabel(value, PARTITION_DETECTION_SUPER_SELECT_OPTIONS()) ??
        value
      );
    case 'schema_resolution':
      return (
        lookupOptionLabel(value, SCHEMA_RESOLUTION_SUPER_SELECT_OPTIONS()) ??
        value
      );
    case 'hive_partitioning':
    case 'header_row':
    case 'optimized_reader':
    case 'late_materialization':
      return (
        lookupOptionLabel(
          value,
          fieldId === 'hive_partitioning'
            ? HIVE_PARTITIONING_SUPER_SELECT_OPTIONS()
            : fieldId === 'header_row'
              ? HEADER_ROW_SUPER_SELECT_OPTIONS()
              : OPTIMIZED_READER_SUPER_SELECT_OPTIONS()
        ) ?? value
      );
    case 'mode':
      return lookupOptionLabel(value, MODE_SUPER_SELECT_OPTIONS()) ?? value;
    case 'error_mode':
      return lookupOptionLabel(value, ERROR_MODE_SUPER_SELECT_OPTIONS()) ?? value;
    case 'multi_value_syntax':
      return lookupOptionLabel(value, MULTI_VALUE_SYNTAX_SUPER_SELECT_OPTIONS()) ?? value;
    case 'delimiter':
      return lookupPresetLabel(value, DELIMITER_PRESETS());
    case 'encoding':
      return lookupPresetLabel(value, ENCODING_PRESETS());
    case 'null_value':
      return lookupPresetLabel(value, NULL_VALUE_PRESETS());
    case 'datetime_format':
      return lookupPresetLabel(value, DATETIME_FORMAT_PRESETS());
    case 'partition_path':
      return lookupPresetLabel(value, PARTITION_PATH_PRESETS());
    default:
      return value;
  }
};

const getFormatLabel = (format: Exclude<DatasetWizardFormValues['settings']['format'], ''>): string => {
  const option = FORMAT_SUPER_SELECT_OPTIONS().find((entry) => entry.value === format);
  if (option && typeof option.inputDisplay === 'string') {
    return option.inputDisplay;
  }

  return format;
};

const getSchemaMappingModeLabel = (mode: SchemaMappingMode): string => {
  switch (mode) {
    case 'automatic':
      return datasetWizardStrings.schemaMappingModeAutomatic();
    case 'aws_glue_table':
      return datasetWizardStrings.schemaMappingModeAwsGlueTable();
    case 'manual':
      return datasetWizardStrings.schemaMappingModeManual();
  }
};

const countManualMappingFields = (mappings: Record<string, object>): number => {
  const properties = mappings.properties;
  if (properties && typeof properties === 'object') {
    return Object.keys(properties).length;
  }

  return Object.keys(mappings).length;
};

export const getReviewLogisticsRows = (
  values: DatasetWizardFormValues,
  dataSources: DataSource[]
): ReviewSummaryRow[] => {
  const selectedDataSource = dataSources.find((dataSource) => dataSource.name === values.data_source);
  const rows: ReviewSummaryRow[] = [
    {
      label: datasetWizardStrings.dataSourceLabel(),
      displayValue: values.data_source.trim() || datasetWizardStrings.reviewNoneValue(),
    },
    {
      label: datasetWizardStrings.reviewDataSourceTypeLabel(),
      displayValue: selectedDataSource
        ? getDataSourceTypeVerbose(selectedDataSource.type)
        : datasetWizardStrings.reviewNoneValue(),
    },
    {
      label: datasetWizardStrings.datasetNameLabel(),
      displayValue: values.name.trim() || datasetWizardStrings.reviewNoneValue(),
    },
    {
      label: datasetWizardStrings.descriptionLabel(),
      displayValue: values.description.trim() || datasetWizardStrings.reviewNoneValue(),
    },
    {
      label: datasetWizardStrings.resourceLabel(),
      displayValue: values.resource.trim() || datasetWizardStrings.reviewNoneValue(),
    },
  ];

  if (values.region.trim()) {
    rows.push({
      label: datasetWizardStrings.regionLabel(),
      displayValue: getAwsRegionLabel(values.region),
    });
  }

  return rows;
};

export const getReviewSettingsRows = (
  settings: DatasetWizardFormValues['settings'],
  resource: string
): ReviewSummaryRow[] => {
  const format = settings.format;
  if (!format) {
    return [];
  }

  const defaults = getDefaultSettingsForFormat(format);
  const inferredFormat = inferFormatFromResource(resource);
  const formatBadge =
    inferredFormat && inferredFormat === format ? undefined : ('modified' as const);

  const rows: ReviewSummaryRow[] = [
    {
      label: createDatasetFlyoutStrings.settingsFormatLabel(),
      displayValue: getFormatLabel(format),
      ...(formatBadge ? { badge: formatBadge } : {}),
    },
  ];

  for (const fieldId of DATASET_SETTINGS_FIELD_IDS) {
    if (!isFieldVisibleForFormat(fieldId, format)) {
      continue;
    }
    if (!isFieldVisibleForErrorMode(fieldId, settings.error_mode)) {
      continue;
    }

    const value = settings[fieldId];
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      continue;
    }

    const defaultValue = defaults[fieldId];
    const isDefault = defaultValue !== undefined && value === defaultValue;

    rows.push({
      label: getDatasetSettingsFieldLabel(fieldId),
      displayValue: formatSettingsFieldDisplayValue(fieldId, value),
      badge: isDefault ? 'default' : 'modified',
    });
  }

  return rows;
};

export const getReviewSchemaMappingRows = (values: DatasetWizardFormValues): ReviewSummaryRow[] => {
  const rows: ReviewSummaryRow[] = [
    {
      label: datasetWizardStrings.schemaMappingModeLegend(),
      displayValue: getSchemaMappingModeLabel(values.schema_mapping_mode),
      badge: values.schema_mapping_mode === 'automatic' ? 'default' : 'modified',
    },
  ];

  if (values.schema_mapping_mode === 'manual') {
    const fieldCount = countManualMappingFields(values.manual_mappings ?? {});
    rows.push({
      label: datasetWizardStrings.reviewManualMappingsLabel(),
      displayValue:
        fieldCount > 0
          ? datasetWizardStrings.reviewManualMappingsCount(fieldCount)
          : datasetWizardStrings.reviewNoneValue(),
      badge: fieldCount > 0 ? 'modified' : undefined,
    });
  }

  if (values.schema_mapping_mode === 'aws_glue_table') {
    rows.push(
      {
        label: datasetWizardStrings.reviewGlueDatabaseLabel(),
        displayValue: values.glue_database.trim() || datasetWizardStrings.reviewNoneValue(),
        badge: values.glue_database.trim() ? 'modified' : undefined,
      },
      {
        label: datasetWizardStrings.reviewGlueTableNameLabel(),
        displayValue: values.glue_table_name.trim() || datasetWizardStrings.reviewNoneValue(),
        badge: values.glue_table_name.trim() ? 'modified' : undefined,
      },
      {
        label: datasetWizardStrings.reviewGlueCatalogRegionLabel(),
        displayValue:
          values.glue_catalog_region.trim() ||
          values.region.trim() ||
          datasetWizardStrings.reviewNoneValue(),
        badge: values.glue_catalog_region.trim() ? 'modified' : undefined,
      },
      {
        label: datasetWizardStrings.reviewGlueAwsAccountIdLabel(),
        displayValue: values.glue_aws_account_id.trim() || datasetWizardStrings.reviewNoneValue(),
        badge: values.glue_aws_account_id.trim() ? 'modified' : undefined,
      }
    );
  }

  return rows;
};
