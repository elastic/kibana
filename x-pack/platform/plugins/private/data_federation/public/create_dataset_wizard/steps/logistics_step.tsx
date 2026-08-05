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
import type { Control, Validate } from 'react-hook-form';
import { useController } from 'react-hook-form';

import type { DataSource } from '../../../common';
import { DATA_SOURCE_TYPES_TO_HELP_TEXT } from '../../../common';
import { DataSourceSuperSelect } from '../data_source_super_select';
import { RegionSuperSelect } from '../region_super_select';
import { datasetWizardStrings } from '../dataset_wizard_i18n';
import type { DatasetWizardFormValues } from '../dataset_wizard_form_state';
import { validateResourceForDataSource } from '../validate_dataset_resource';

const trimRequired =
  (message: string) =>
  (value: string): true | string =>
    value?.trim() ? true : message;

export interface LogisticsStepProps {
  control: Control<DatasetWizardFormValues>;
  dataSources: DataSource[];
  onConnectNewDataSource: () => void;
  validateName: Validate<string, DatasetWizardFormValues>;
}

export const LogisticsStep: FunctionComponent<LogisticsStepProps> = ({
  control,
  dataSources,
  onConnectNewDataSource,
  validateName,
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

  const { field: regionField, fieldState: regionFieldState } = useController({
    name: 'region',
    control,
    rules: {
      validate: trimRequired(datasetWizardStrings.regionRequired()),
    },
  });

  const onDataSourceChange = useCallback(
    (selectedValue: string) => {
      dataSourceField.onChange(selectedValue);
    },
    [dataSourceField]
  );

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
            name={resourceField.name}
            inputRef={resourceField.ref}
          />
        </EuiFormRow>

        <EuiFormRow
          label={datasetWizardStrings.regionLabel()}
          fullWidth
          isInvalid={Boolean(regionFieldState.error)}
          error={regionFieldState.error?.message}
        >
          <RegionSuperSelect
            data-test-subj="datasetWizardRegion"
            fullWidth
            aria-label={datasetWizardStrings.regionLabel()}
            placeholder={datasetWizardStrings.regionPlaceholder()}
            isInvalid={Boolean(regionFieldState.error)}
            value={regionField.value || undefined}
            onChange={regionField.onChange}
            onBlur={regionField.onBlur}
            name={regionField.name}
            buttonRef={regionField.ref}
          />
        </EuiFormRow>
      </EuiForm>
    </>
  );
};
