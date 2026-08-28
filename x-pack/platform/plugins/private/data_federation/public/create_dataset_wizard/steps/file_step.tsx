/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import type { EuiDescriptionListProps } from '@elastic/eui';
import {
  EuiDescriptionList,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { Control, UseFormSetValue, Validate } from 'react-hook-form';
import { useController } from 'react-hook-form';

import { datasetSettingsFieldsWidthCss } from '../../create_dataset_flyout/dataset_settings_fields_layout';
import { FORMAT_SUPER_SELECT_OPTIONS } from '../../create_dataset_flyout/dataset_settings_options';
import { getDataSourceTypeVerbose } from '../../get_data_source_type_label';
import { datasetWizardStrings } from '../dataset_wizard_i18n';
import type { DatasetWizardFormValues } from '../dataset_wizard_form_state';
import { deriveDatasetNameFromUri } from '../derive_dataset_name_from_uri';
import type { ParsedFileUri } from '../parse_file_uri';
import { parseFileUri } from '../parse_file_uri';

export interface FileStepProps {
  control: Control<DatasetWizardFormValues>;
  setValue: UseFormSetValue<DatasetWizardFormValues>;
  validateName: Validate<string, DatasetWizardFormValues>;
}

const getFormatHintLabel = (formatHint: ParsedFileUri['formatHint']): string => {
  if (!formatHint) {
    return datasetWizardStrings.fileDetectedNotDetected();
  }

  const option = FORMAT_SUPER_SELECT_OPTIONS().find((entry) => entry.value === formatHint);

  return typeof option?.inputDisplay === 'string' ? option.inputDisplay : formatHint;
};

export const FileStep: FunctionComponent<FileStepProps> = ({ control, setValue, validateName }) => {
  const { field: resourceField, fieldState: resourceFieldState } = useController({
    name: 'resource',
    control,
    rules: {
      validate: (value: string) => (value?.trim() ? true : datasetWizardStrings.resourceRequired()),
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

  // A name that already exists (edit, clone, restored draft) counts as manually
  // set, so deriving from the URI never overwrites it.
  const isNameSetByUserRef = useRef(Boolean(nameField.value?.trim()));

  const parsedUri = useMemo(() => parseFileUri(resourceField.value ?? ''), [resourceField.value]);
  const derivedName = useMemo(
    () => deriveDatasetNameFromUri(resourceField.value ?? ''),
    [resourceField.value]
  );

  useEffect(() => {
    if (isNameSetByUserRef.current || !derivedName || derivedName === nameField.value) {
      return;
    }

    setValue('name', derivedName, { shouldDirty: true, shouldValidate: true });
  }, [derivedName, nameField.value, setValue]);

  const onNameChange = useCallback(
    (value: string) => {
      isNameSetByUserRef.current = true;
      nameField.onChange(value);
    },
    [nameField]
  );

  const detectedItems = useMemo<EuiDescriptionListProps['listItems']>(() => {
    if (!parsedUri) {
      return [];
    }

    const notDetected = datasetWizardStrings.fileDetectedNotDetected();

    return [
      {
        title: datasetWizardStrings.fileDetectedTypeLabel(),
        description: getDataSourceTypeVerbose(parsedUri.type),
      },
      {
        title: datasetWizardStrings.fileDetectedBucketLabel(),
        description: parsedUri.bucket || notDetected,
      },
      {
        title: datasetWizardStrings.fileDetectedPrefixLabel(),
        description: parsedUri.prefix || notDetected,
      },
      {
        title: datasetWizardStrings.fileDetectedFormatHintLabel(),
        description: getFormatHintLabel(parsedUri.formatHint),
      },
    ];
  }, [parsedUri]);

  const nameHelpText = nameField.value?.trim()
    ? datasetWizardStrings.datasetNameEsqlHelp(`FROM ${nameField.value.trim()}`)
    : datasetWizardStrings.datasetNameHelp();

  return (
    <div data-test-subj="datasetWizardFileStep">
      <EuiTitle size="s">
        <h3>{datasetWizardStrings.fileTitle()}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>{datasetWizardStrings.fileDescription()}</p>
      </EuiText>
      <EuiSpacer size="l" />

      <EuiForm component="div">
        <div css={datasetSettingsFieldsWidthCss}>
          <EuiFormRow
            label={datasetWizardStrings.fileUriLabel()}
            helpText={datasetWizardStrings.fileUriHelp()}
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
              onChange={(event) => resourceField.onChange(event.target.value)}
              onBlur={resourceField.onBlur}
              name={resourceField.name}
              inputRef={resourceField.ref}
            />
          </EuiFormRow>

          {parsedUri ? (
            <>
              <EuiText size="xs" color="subdued">
                <strong>{datasetWizardStrings.fileDetectedTitle()}</strong>
              </EuiText>
              <EuiSpacer size="xs" />
              <EuiDescriptionList
                type="column"
                compressed
                columnWidths={[1, 3]}
                listItems={detectedItems}
                data-test-subj="datasetWizardFileDetectedDetails"
              />
              <EuiSpacer size="l" />
            </>
          ) : null}

          <EuiFormRow
            label={datasetWizardStrings.datasetNameLabel()}
            helpText={nameHelpText}
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
              onChange={(event) => onNameChange(event.target.value)}
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
              onChange={(event) => descriptionField.onChange(event.target.value)}
              name={descriptionField.name}
              inputRef={descriptionField.ref}
            />
          </EuiFormRow>
        </div>
      </EuiForm>
    </div>
  );
};
