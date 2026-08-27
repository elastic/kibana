/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useMemo } from 'react';
import {
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { Control, UseFormSetValue, Validate } from 'react-hook-form';
import { useController } from 'react-hook-form';

import type { DataSource } from '../../../common';
import { DATA_SOURCE_TYPES_TO_HELP_TEXT } from '../../../common';
import { datasetSettingsFieldsWidthCss } from '../../create_dataset_flyout/dataset_settings_fields_layout';
import { DataSourceSuperSelect } from '../data_source_super_select';
import { datasetWizardStrings } from '../dataset_wizard_i18n';
import { isDatasetWizardFlow3, type DatasetWizardFlowVariant } from '../dataset_wizard_flow_variant';
import type { DatasetWizardFormValues } from '../dataset_wizard_form_state';
import { validateResourceForDataSource } from '../validate_dataset_resource';
import { WizardRegionField } from '../wizard_region_field';

const trimRequired =
  (message: string) =>
  (value: string): true | string =>
    value?.trim() ? true : message;

export interface LogisticsStepProps {
  control: Control<DatasetWizardFormValues>;
  dataSources: DataSource[];
  onConnectNewDataSource: () => void;
  validateName: Validate<string, DatasetWizardFormValues>;
  setValue: UseFormSetValue<DatasetWizardFormValues>;
  flowVariant: DatasetWizardFlowVariant;
  syncRegionFromResource: (resource: string, dataSourceName: string) => void;
  autoDetectedRegion?: string;
  onRegionManualChange?: (regionId: string) => void;
}

export const LogisticsStep: FunctionComponent<LogisticsStepProps> = ({
  control,
  dataSources,
  onConnectNewDataSource,
  validateName,
  setValue,
  flowVariant,
  syncRegionFromResource,
  autoDetectedRegion = '',
  onRegionManualChange,
}) => {
  const { field: dataSourceField, fieldState: dataSourceFieldState } = useController({
    name: 'data_source',
    control,
    rules: {
      validate: trimRequired(datasetWizardStrings.dataSourceRequired()),
    },
  });

  const { field: nameField, fieldState: nameFieldState } = useController({
    name: 'name',
    control,
    rules: {
      validate: validateName,
    },
  });

  const { field: descriptionField } = useController({
    name: 'description',
    control,
  });

  const { field: resourceField, fieldState: resourceFieldState } = useController({
    name: 'resource',
    control,
    rules: {
      validate: (value, formValues) => {
        const requiredResult = trimRequired(datasetWizardStrings.resourceRequired())(value);
        if (requiredResult !== true) {
          return requiredResult;
        }

        return validateResourceForDataSource(value, formValues.data_source, dataSources);
      },
    },
  });

  const showRegion = !isDatasetWizardFlow3(flowVariant);

  const onDataSourceChange = useCallback(
    (selectedValue: string) => {
      dataSourceField.onChange(selectedValue);
    },
    [dataSourceField]
  );

  const onResourceBlur = useCallback(() => {
    resourceField.onBlur();

    const selectedDataSource = dataSources.find(
      (dataSource) => dataSource.name === dataSourceField.value
    );
    if (selectedDataSource && selectedDataSource.type !== 's3') {
      return;
    }

    syncRegionFromResource(resourceField.value, dataSourceField.value);
  }, [dataSourceField.value, resourceField, syncRegionFromResource]);

  const resourceHelpText = useMemo(() => {
    const selected = dataSources.find((ds) => ds.name === dataSourceField.value);
    if (!selected) {
      return datasetWizardStrings.resourceHelp();
    }
    return DATA_SOURCE_TYPES_TO_HELP_TEXT[selected.type] ?? datasetWizardStrings.resourceHelp();
  }, [dataSourceField.value, dataSources]);

  return (
    <>
      <EuiTitle size="s">
        <h3>{datasetWizardStrings.logisticsTitle()}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>{datasetWizardStrings.logisticsDescription()}</p>
      </EuiText>
      <EuiSpacer size="l" />

      <EuiForm component="div">
        <div css={datasetSettingsFieldsWidthCss}>
          <EuiFormRow
            label={datasetWizardStrings.dataSourceLabel()}
            fullWidth
            isInvalid={Boolean(dataSourceFieldState.error)}
            error={dataSourceFieldState.error?.message}
          >
            <DataSourceSuperSelect
              dataSources={dataSources}
              data-test-subj="datasetWizardDataSource"
              fullWidth
              aria-label={datasetWizardStrings.dataSourceLabel()}
              placeholder={datasetWizardStrings.dataSourcePlaceholder()}
              searchPlaceholder={datasetWizardStrings.dataSourceSearchPlaceholder()}
              connectNewDataSourceLabel={datasetWizardStrings.connectNewDataSource()}
              value={dataSourceField.value || undefined}
              onChange={onDataSourceChange}
              onConnectNewDataSource={onConnectNewDataSource}
              name={dataSourceField.name}
              buttonRef={dataSourceField.ref}
              isInvalid={Boolean(dataSourceFieldState.error)}
            />
          </EuiFormRow>

          <EuiFormRow
            label={datasetWizardStrings.datasetNameLabel()}
            helpText={datasetWizardStrings.datasetNameHelp()}
            fullWidth
            isInvalid={Boolean(nameFieldState.error)}
            error={nameFieldState.error?.message}
          >
            <EuiFieldText
              data-test-subj="datasetWizardName"
              fullWidth
              placeholder={datasetWizardStrings.datasetNamePlaceholder()}
              isInvalid={Boolean(nameFieldState.error)}
              value={nameField.value}
              onChange={(e) => nameField.onChange(e.target.value)}
              name={nameField.name}
              inputRef={nameField.ref}
            />
          </EuiFormRow>

          <EuiFormRow label={datasetWizardStrings.descriptionLabel()} fullWidth>
            <EuiFieldText
              data-test-subj="datasetWizardDescription"
              fullWidth
              placeholder={datasetWizardStrings.descriptionPlaceholder()}
              value={descriptionField.value}
              onChange={(e) => descriptionField.onChange(e.target.value)}
              name={descriptionField.name}
              inputRef={descriptionField.ref}
            />
          </EuiFormRow>

          <EuiFormRow
            label={datasetWizardStrings.resourceLabel()}
            helpText={resourceHelpText}
            fullWidth
            isInvalid={Boolean(resourceFieldState.error)}
            error={resourceFieldState.error?.message}
          >
            <EuiFieldText
              data-test-subj="datasetWizardResource"
              fullWidth
              placeholder={datasetWizardStrings.resourcePlaceholder()}
              autoComplete="off"
              isInvalid={Boolean(resourceFieldState.error)}
              value={resourceField.value}
              onChange={(e) => resourceField.onChange(e.target.value)}
              onBlur={onResourceBlur}
              name={resourceField.name}
              inputRef={resourceField.ref}
            />
          </EuiFormRow>

          {showRegion ? (
            <WizardRegionField
              control={control}
              autoDetectedRegion={autoDetectedRegion}
              onRegionManualChange={onRegionManualChange}
            />
          ) : null}
        </div>
      </EuiForm>
    </>
  );
};
