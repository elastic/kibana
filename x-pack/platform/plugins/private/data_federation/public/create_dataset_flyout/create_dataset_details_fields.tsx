/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiFieldText, EuiFormRow, EuiSelect, EuiTextArea, useEuiTheme } from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';

import type { DataSource } from '../../common';
import { validateIndexNameRules } from '../../common';
import type { CreateDatasetFormValues } from './create_dataset_flyout_form_state';
import { createDatasetFlyoutStrings } from './create_dataset_flyout_i18n';

const trimRequired =
  (message: string) =>
  (value: string): true | string =>
    value?.trim() ? true : message;

export interface CreateDatasetDetailsFieldsProps {
  control: Control<CreateDatasetFormValues>;
  dataSources: DataSource[];
  existingDataSetNames?: readonly string[];
  isEditMode?: boolean;
  initialIdNormalized?: string;
  autoFocusName?: boolean;
}

export function CreateDatasetDetailsFields({
  control,
  dataSources,
  existingDataSetNames = [],
  isEditMode = false,
  initialIdNormalized = '',
  autoFocusName = false,
}: CreateDatasetDetailsFieldsProps) {
  const { euiTheme } = useEuiTheme();
  const { field: nameField, fieldState: nameFieldState } = useController({
    name: 'name',
    control,
    rules: {
      validate: (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) {
          return createDatasetFlyoutStrings.nameRequired();
        }

        const nameValidation = validateIndexNameRules(trimmed);
        if (nameValidation) {
          return nameValidation.message;
        }

        const normalized = trimmed.toLowerCase();
        const isDuplicate = existingDataSetNames.some((n) => {
          const nNormalized = n.trim().toLowerCase();
          if (isEditMode && nNormalized === initialIdNormalized) {
            return false;
          }
          return nNormalized === normalized;
        });
        return isDuplicate ? createDatasetFlyoutStrings.nameAlreadyExists() : true;
      },
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
      validate: trimRequired(createDatasetFlyoutStrings.dataSourceRequired()),
    },
  });

  const { field: resourceField, fieldState: resourceFieldState } = useController({
    name: 'resource',
    control,
    rules: {
      validate: trimRequired(createDatasetFlyoutStrings.resourceRequired()),
    },
  });

  const isDataSourceEmpty = !dataSourceIdField.value;

  const dataSourceOptions = useMemo(() => {
    const placeholder = {
      value: '',
      text: createDatasetFlyoutStrings.dataSourcePlaceholder(),
    };
    const fromSources = dataSources.map((ds) => ({
      value: ds.name,
      text: ds.name,
    }));
    return [placeholder, ...fromSources];
  }, [dataSources]);

  const dataSourceSelectCss = css({
    color: isDataSourceEmpty ? euiTheme.colors.textSubdued : undefined,
    '& option': {
      color: euiTheme.colors.textParagraph,
    },
  });

  return (
    <>
      <EuiFormRow
        label={createDatasetFlyoutStrings.dataSourceLabel()}
        fullWidth
        isInvalid={Boolean(dataSourceFieldState.error)}
        error={dataSourceFieldState.error?.message}
      >
        <EuiSelect
          options={dataSourceOptions}
          data-test-subj="createDatasetFlyoutDataSource"
          fullWidth
          aria-label={createDatasetFlyoutStrings.dataSourceLabel()}
          value={dataSourceIdField.value}
          onChange={(e) => dataSourceIdField.onChange(e.target.value)}
          name={dataSourceIdField.name}
          inputRef={dataSourceIdField.ref}
          disabled={dataSources.length === 0}
          isInvalid={Boolean(dataSourceFieldState.error)}
          css={dataSourceSelectCss}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDatasetFlyoutStrings.nameLabel()}
        helpText={createDatasetFlyoutStrings.nameHelp()}
        fullWidth
        isInvalid={Boolean(nameFieldState.error)}
        error={nameFieldState.error?.message}
      >
        <EuiFieldText
          data-test-subj="createDatasetFlyoutName"
          autoFocus={autoFocusName}
          fullWidth
          placeholder={createDatasetFlyoutStrings.namePlaceholder()}
          isInvalid={Boolean(nameFieldState.error)}
          value={nameField.value}
          onChange={(e) => nameField.onChange(e.target.value)}
          name={nameField.name}
          inputRef={nameField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDatasetFlyoutStrings.descriptionLabel()}
        helpText={createDatasetFlyoutStrings.descriptionHelp()}
        fullWidth
      >
        <EuiTextArea
          data-test-subj="createDatasetFlyoutDescription"
          fullWidth
          rows={1}
          placeholder={createDatasetFlyoutStrings.descriptionPlaceholder()}
          value={descriptionField.value}
          onChange={(e) => descriptionField.onChange(e.target.value)}
          name={descriptionField.name}
          inputRef={descriptionField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDatasetFlyoutStrings.resourceLabel()}
        helpText={createDatasetFlyoutStrings.resourceHelp()}
        fullWidth
        isInvalid={Boolean(resourceFieldState.error)}
        error={resourceFieldState.error?.message}
      >
        <EuiFieldText
          data-test-subj="createDatasetFlyoutResource"
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
