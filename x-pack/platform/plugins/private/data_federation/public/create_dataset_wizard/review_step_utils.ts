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
import { getSettingDefaultLabel } from '../create_dataset_flyout/dataset_settings_default_hints';
import { FORMAT_SUPER_SELECT_OPTIONS } from '../create_dataset_flyout/dataset_settings_options';
import {
  formatSettingsFieldDisplayValue,
  getDatasetSettingsFieldLabel,
} from '../create_dataset_flyout/dataset_settings_value_labels';
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

export const buildDatasetPayloadFromWizardValues = (
  values: DatasetWizardFormValues
): DataSetWithName => {
  const desc = values.description?.trim();
  const settings = mergeCustomJsonIntoDatasetSettings(
    buildDatasetSettingsFromFormValues(values.settings),
    values.settings_custom_json
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

  return rows;
};

export const getReviewSettingsRows = (
  settings: DatasetWizardFormValues['settings'],
  resource: string,
  customJson?: string,
  flowVariant: DatasetWizardFlowVariant = DATASET_WIZARD_FLOW_VARIANT_1
): ReviewSummaryRow[] => {
  const format = settings.format;
  if (!format) {
    return [];
  }

  const effectiveSettings = customJson
    ? applyCustomJsonToFormSettings(settings, customJson)
    : settings;
  const defaults = getDefaultSettingsForFormat(format);
  const showUnsetAsDefaults = isDatasetWizardFlow396(flowVariant);
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
    if (!isFieldVisibleForErrorMode(fieldId, effectiveSettings.error_mode)) {
      continue;
    }

    const value = effectiveSettings[fieldId];
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      // Flows that leave defaults as placeholders still owe the reader the
      // value Elasticsearch will apply.
      const defaultLabel = showUnsetAsDefaults
        ? getSettingDefaultLabel(fieldId, format)
        : undefined;

      if (defaultLabel) {
        rows.push({
          label: getDatasetSettingsFieldLabel(fieldId),
          displayValue: defaultLabel,
          badge: 'default',
        });
      }

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

export const getReviewSchemaMappingRows = (
  values: DatasetWizardFormValues,
  flowVariant: DatasetWizardFlowVariant = DATASET_WIZARD_FLOW_VARIANT_2
): ReviewSummaryRow[] => {
  const rows: ReviewSummaryRow[] = [
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

      rows.push({
        label: datasetWizardStrings.dynamicFieldsTitle(),
        displayValue: isDynamicEnabled
          ? datasetWizardStrings.reviewDynamicFieldsOn()
          : datasetWizardStrings.reviewDynamicFieldsOff(),
        badge: isDynamicEnabled ? 'default' : 'modified',
      });

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
