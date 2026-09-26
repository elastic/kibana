/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldText, EuiFormRow, EuiTextArea } from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';

import type { DataSource } from '../../common';
import type { CreateDatasetFormValues } from './create_dataset_form_state';
import { createDatasetWizardStrings } from './create_dataset_wizard_i18n';
import { DataSourceSelect } from './components/data_source_select';
import { validateDatasetName, validateResource } from './validators';

const trimRequired =
  (message: string) =>
  (value: string): true | string =>
    value?.trim() ? true : message;

export interface CreateDatasetDetailsFieldsProps {
  control: Control<CreateDatasetFormValues>;
  dataSources: DataSource[];
  existingDataSetNames?: readonly string[];
  isEditMode?: boolean;
  datasetNameToEdit?: string;
  loadDataSources: () => Promise<void>;
}

export function CreateDatasetDetailsFields({
  control,
  dataSources,
  existingDataSetNames = [],
  isEditMode = false,
  datasetNameToEdit = '',
  loadDataSources,
}: CreateDatasetDetailsFieldsProps) {
  const { field: nameField, fieldState: nameFieldState } = useController({
    name: 'name',
    control,
    rules: {
      validate: validateDatasetName({
        existingDataSetNames,
        isEditMode,
        datasetNameToEdit,
      }),
    },
  });

  const { field: descriptionField } = useController({
    name: 'description',
    control,
  });

  const { field: dataSourceIdField, fieldState: dataSourceFieldState } = useController({
    name: 'data_source',
    control,
    rules: {
      validate: trimRequired(createDatasetWizardStrings.dataSourceRequired),
    },
  });

  const { field: resourceField, fieldState: resourceFieldState } = useController({
    name: 'resource',
    control,
    rules: {
      validate: validateResource,
    },
  });

  return (
    <>
      <EuiFormRow
        label={createDatasetWizardStrings.dataSourceLabel}
        fullWidth
        isInvalid={Boolean(dataSourceFieldState.error)}
        error={dataSourceFieldState.error?.message}
      >
        <DataSourceSelect
          dataSources={dataSources}
          value={dataSourceIdField.value}
          isInvalid={Boolean(dataSourceFieldState.error)}
          onChange={dataSourceIdField.onChange}
          onBlur={dataSourceIdField.onBlur}
          loadDataSources={loadDataSources}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDatasetWizardStrings.nameLabel}
        helpText={createDatasetWizardStrings.nameHelp}
        fullWidth
        isInvalid={Boolean(nameFieldState.error)}
        error={nameFieldState.error?.message}
      >
        <EuiFieldText
          data-test-subj="createDatasetName"
          fullWidth
          placeholder={createDatasetWizardStrings.namePlaceholder}
          isInvalid={Boolean(nameFieldState.error)}
          value={nameField.value}
          onChange={(e) => nameField.onChange(e.target.value)}
          name={nameField.name}
          inputRef={nameField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDatasetWizardStrings.descriptionLabel}
        helpText={createDatasetWizardStrings.descriptionHelp}
        fullWidth
      >
        <EuiTextArea
          data-test-subj="createDatasetDescription"
          fullWidth
          rows={1}
          value={descriptionField.value}
          onChange={(e) => descriptionField.onChange(e.target.value)}
          name={descriptionField.name}
          inputRef={descriptionField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDatasetWizardStrings.resourceLabel}
        helpText={createDatasetWizardStrings.resourceHelp}
        fullWidth
        isInvalid={Boolean(resourceFieldState.error)}
        error={resourceFieldState.error?.message}
      >
        <EuiFieldText
          data-test-subj="createDatasetResource"
          fullWidth
          autoComplete="off"
          isInvalid={Boolean(resourceFieldState.error)}
          value={resourceField.value}
          onChange={(e) => resourceField.onChange(e.target.value)}
          name={resourceField.name}
          inputRef={resourceField.ref}
        />
      </EuiFormRow>
    </>
  );
}
