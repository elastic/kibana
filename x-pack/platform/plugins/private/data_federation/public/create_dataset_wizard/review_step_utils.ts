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
import {
  applyCustomJsonToFormSettings,
  mergeCustomJsonIntoDatasetSettings,
} from '../create_dataset_flyout/settings_custom_json_utils';
import { createDatasetFlyoutStrings } from '../create_dataset_flyout/create_dataset_flyout_i18n';
import { getDefaultSettingsForFormat } from '../create_dataset_flyout/dataset_settings_defaults';
import { FORMAT_SUPER_SELECT_OPTIONS } from '../create_dataset_flyout/dataset_settings_options';
import {
  formatSettingsFieldDisplayValue,
  getDatasetSettingsFieldLabel,
} from '../create_dataset_flyout/dataset_settings_value_labels';
import type { DatasetSettingsFieldId } from '../create_dataset_flyout/dataset_settings_visibility';
import {
  DATASET_SETTINGS_FIELD_IDS,
  isFieldVisibleForErrorMode,
  isFieldVisibleForFormat,
} from '../create_dataset_flyout/dataset_settings_visibility';
import { getAwsRegionLabel } from './aws_regions';
import { datasetWizardStrings } from './dataset_wizard_i18n';
import {
  DATASET_WIZARD_FLOW_VARIANT_1,
  DATASET_WIZARD_FLOW_VARIANT_2,
  hasDatasetWizardRegionField,
  isDatasetWizardFlow3,
  isDatasetWizardFlow396,
  type DatasetWizardFlowVariant,
} from './dataset_wizard_flow_variant';
import type { DatasetWizardFormValues, SchemaMappingMode } from './dataset_wizard_form_state';
import { inferFormatFromResource } from './infer_format_from_resource';
import { getVisibleResourceOwnedSettingsFieldIds } from './resource_settings_fields';
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
    if (typeof value === 'string' && value === '') {
      return true;
    }
    return false;
  });

const DEFAULT_TEMPLATE_PARTITION_PATH = '{year}/{month}/{day}';

const withTemplatePartitionPathDefault = (
  settings: ReturnType<typeof mergeCustomJsonIntoDatasetSettings>
): ReturnType<typeof mergeCustomJsonIntoDatasetSettings> => {
  if (!settings || settings.partition_detection !== 'template' || settings.partition_path) {
    return settings;
  }

  return { ...settings, partition_path: DEFAULT_TEMPLATE_PARTITION_PATH };
};

export const buildDatasetPayloadFromWizardValues = (
  values: DatasetWizardFormValues
): DataSetWithName => {
  const desc = values.description?.trim();
  const settings = withTemplatePartitionPathDefault(
    mergeCustomJsonIntoDatasetSettings(
      buildDatasetSettingsFromFormValues(values.settings),
      values.settings_custom_json
    )
  );

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

const getEffectiveWizardSettings = (
  settings: DatasetWizardFormValues['settings'],
  customJson?: string
): DatasetWizardFormValues['settings'] =>
  customJson ? applyCustomJsonToFormSettings(settings, customJson) : settings;

const getReviewFlow396LogisticsSettingBadge = (
  flowVariant: DatasetWizardFlowVariant
): ReviewSettingBadge | undefined =>
  isDatasetWizardFlow396(flowVariant) ? 'modified' : undefined;

const getReviewFormatRow = (
  format: Exclude<DatasetWizardFormValues['settings']['format'], ''>,
  resource: string,
  flowVariant: DatasetWizardFlowVariant = DATASET_WIZARD_FLOW_VARIANT_2
): ReviewSummaryRow => {
  const flow396Badge = getReviewFlow396LogisticsSettingBadge(flowVariant);
  if (flow396Badge) {
    return {
      label: createDatasetFlyoutStrings.settingsFormatLabel(),
      displayValue: getFormatLabel(format),
      badge: flow396Badge,
    };
  }

  const inferredFormat = inferFormatFromResource(resource);
  const formatBadge =
    inferredFormat && inferredFormat === format ? undefined : ('modified' as const);

  return {
    label: createDatasetFlyoutStrings.settingsFormatLabel(),
    displayValue: getFormatLabel(format),
    ...(formatBadge ? { badge: formatBadge } : {}),
  };
};

const getFormatLabel = (
  format: Exclude<DatasetWizardFormValues['settings']['format'], ''>
): string => {
  const option = FORMAT_SUPER_SELECT_OPTIONS().find((entry) => entry.value === format);
  if (option && typeof option.inputDisplay === 'string') {
    return option.inputDisplay;
  }

  return format;
};

const getSchemaMappingModeLabel = (
  mode: SchemaMappingMode,
  flowVariant: DatasetWizardFlowVariant = DATASET_WIZARD_FLOW_VARIANT_2
): string => {
  switch (mode) {
    case 'automatic':
      return flowVariant === DATASET_WIZARD_FLOW_VARIANT_1
        ? datasetWizardStrings.schemaMappingModeAutomaticFlow1()
        : datasetWizardStrings.schemaMappingModeAutomatic();
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
  dataSources: DataSource[],
  flowVariant: DatasetWizardFlowVariant = DATASET_WIZARD_FLOW_VARIANT_1
): ReviewSummaryRow[] => {
  const selectedDataSource = dataSources.find(
    (dataSource) => dataSource.name === values.data_source
  );
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

  if (hasDatasetWizardRegionField(flowVariant) && values.region.trim()) {
    rows.push({
      label: datasetWizardStrings.regionLabel(),
      displayValue: getAwsRegionLabel(values.region),
    });
  }

  const effectiveSettings = getEffectiveWizardSettings(
    values.settings,
    values.settings_custom_json
  );
  const resource = values.resource.trim();
  const logisticsSettingBadge = getReviewFlow396LogisticsSettingBadge(flowVariant);

  if (isDatasetWizardFlow396(flowVariant) && effectiveSettings.format) {
    rows.push(getReviewFormatRow(effectiveSettings.format, resource, flowVariant));
  }

  // Settings asked for beside the resource are summarized with it rather than with the format
  // settings, so the summary follows the steps.
  for (const fieldId of getVisibleResourceOwnedSettingsFieldIds(
    flowVariant,
    effectiveSettings.partition_detection
  )) {
    const value = effectiveSettings[fieldId];
    if (!value || value.trim() === '') {
      continue;
    }

    rows.push({
      label: getDatasetSettingsFieldLabel(fieldId),
      displayValue: formatSettingsFieldDisplayValue(fieldId, value),
      ...(logisticsSettingBadge ? { badge: logisticsSettingBadge } : {}),
    });
  }

  return rows;
};

export const getReviewSettingsRows = (
  settings: DatasetWizardFormValues['settings'],
  resource: string,
  customJson?: string,
  excludeFieldIds: readonly DatasetSettingsFieldId[] = [],
  flowVariant: DatasetWizardFlowVariant = DATASET_WIZARD_FLOW_VARIANT_2
): ReviewSummaryRow[] => {
  const format = settings.format;
  if (!format) {
    return [];
  }

  const effectiveSettings = getEffectiveWizardSettings(settings, customJson);
  const defaults = getDefaultSettingsForFormat(format);
  const isFlow396 = isDatasetWizardFlow396(flowVariant);

  const rows: ReviewSummaryRow[] = isFlow396
    ? []
    : [getReviewFormatRow(format, resource, flowVariant)];

  for (const fieldId of DATASET_SETTINGS_FIELD_IDS) {
    if (excludeFieldIds.includes(fieldId)) {
      continue;
    }
    if (!isFieldVisibleForFormat(fieldId, format)) {
      continue;
    }
    if (!isFieldVisibleForErrorMode(fieldId, effectiveSettings.error_mode)) {
      continue;
    }

    const value = effectiveSettings[fieldId];
    // A setting left unset is one Elasticsearch decides, so the review only
    // covers what the user chose.
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      continue;
    }

    const defaultValue = defaults[fieldId];
    const isDefault = defaultValue !== undefined && value === defaultValue;

    rows.push({
      label: getDatasetSettingsFieldLabel(fieldId),
      displayValue: formatSettingsFieldDisplayValue(fieldId, value),
      badge: isFlow396 ? 'modified' : isDefault ? 'default' : 'modified',
    });
  }

  return rows;
};

const appendFlow396TimeseriesReviewRows = (
  rows: ReviewSummaryRow[],
  values: DatasetWizardFormValues
) => {
  const isTimeseriesEnabled = values.timeseries_mapping_enabled !== false;

  rows.push({
    label: datasetWizardStrings.timestampMappingSectionTitle(),
    displayValue: isTimeseriesEnabled
      ? datasetWizardStrings.reviewDynamicFieldsOn()
      : datasetWizardStrings.reviewDynamicFieldsOff(),
    badge: isTimeseriesEnabled ? 'default' : 'modified',
  });

  if (!isTimeseriesEnabled) {
    return;
  }

  const fieldPath = values.timeseries_field_path?.trim() ?? '';

  rows.push({
    label: datasetWizardStrings.timestampMappingPathLabel(),
    displayValue: fieldPath || datasetWizardStrings.reviewNoneValue(),
    badge: fieldPath ? 'modified' : undefined,
  });
};

export const getReviewSchemaMappingRows = (
  values: DatasetWizardFormValues,
  flowVariant: DatasetWizardFlowVariant = DATASET_WIZARD_FLOW_VARIANT_2
): ReviewSummaryRow[] => {
  const rows: ReviewSummaryRow[] = isDatasetWizardFlow396(flowVariant)
    ? []
    : [
        {
          label: datasetWizardStrings.schemaMappingModeLegend(),
          displayValue: getSchemaMappingModeLabel(values.schema_mapping_mode, flowVariant),
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

  if (values.schema_mapping_mode === 'automatic' && flowVariant !== DATASET_WIZARD_FLOW_VARIANT_1) {
    const mappedFieldCount = Object.keys(values.automatic_field_types ?? {}).length;

    if (isDatasetWizardFlow3(flowVariant)) {
      const isDynamicEnabled = values.dynamic_fields_enabled !== false;

      if (isDatasetWizardFlow396(flowVariant)) {
        appendFlow396TimeseriesReviewRows(rows, values);
        rows.push({
          label: datasetWizardStrings.schemaInferenceModeReviewLabel(),
          displayValue: isDynamicEnabled
            ? datasetWizardStrings.reviewSchemaInferenceInfer()
            : datasetWizardStrings.reviewSchemaInferenceManual(),
          badge: isDynamicEnabled ? 'default' : 'modified',
        });
      } else {
        rows.push({
          label: datasetWizardStrings.dynamicFieldsTitle(),
          displayValue: isDynamicEnabled
            ? datasetWizardStrings.reviewDynamicFieldsOn()
            : datasetWizardStrings.reviewDynamicFieldsOff(),
          badge: isDynamicEnabled ? 'default' : 'modified',
        });
      }

      if (mappedFieldCount > 0) {
        rows.push({
          label: datasetWizardStrings.reviewManualMappingsLabel(),
          displayValue: datasetWizardStrings.reviewManualMappingsCount(mappedFieldCount),
          badge: 'modified',
        });
      }
    } else if (mappedFieldCount > 0) {
      rows.push({
        label: datasetWizardStrings.reviewAutomaticFieldTypesLabel(),
        displayValue: datasetWizardStrings.reviewAutomaticFieldTypesCount(mappedFieldCount),
        badge: 'modified',
      });
    }
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
