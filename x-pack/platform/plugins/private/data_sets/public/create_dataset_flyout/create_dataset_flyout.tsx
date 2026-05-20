/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { useController, useForm } from 'react-hook-form';

import type { DataSetWithName, DataSource } from '../../common';
import { getFlyoutSaveErrorMessage } from '../get_flyout_save_error_message';
import { createDatasetFlyoutStrings } from './create_dataset_flyout_i18n';

export interface CreateDatasetFormValues {
  name: string;
  description: string;
  data_source: string;
  resource: string;
}

export interface CreateDatasetFlyoutProps {
  onClose: () => void;
  /**
   * Persist a new data set. Resolve `null` on success, or an error message to show in the flyout.
   */
  onSave: (data: DataSetWithName) => Promise<string | null>;
  /** Data sources used to populate the data source selector (typically `HttpDataSourcesClient.get()`). */
  dataSources: DataSource[];
}

const trimRequired =
  (message: string) =>
  (value: string): true | string =>
    value.trim() ? true : message;

export const CreateDatasetFlyout: FunctionComponent<CreateDatasetFlyoutProps> = ({
  onClose,
  onSave,
  dataSources,
}) => {
  const [saveError, setSaveError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateDatasetFormValues>({
    defaultValues: {
      name: '',
      description: '',
      data_source: '',
      resource: '',
    },
  });

  const { field: nameField } = useController({
    name: 'name',
    control,
    rules: {
      validate: trimRequired(createDatasetFlyoutStrings.nameRequired()),
    },
  });

  const { field: descriptionField } = useController({
    name: 'description',
    control,
  });

  const { field: dataSourceIdField } = useController({
    name: 'data_source',
    control,
    rules: {
      validate: trimRequired(createDatasetFlyoutStrings.dataSourceRequired()),
    },
  });

  const { field: resourceField } = useController({
    name: 'resource',
    control,
    rules: {
      validate: trimRequired(createDatasetFlyoutStrings.resourceRequired()),
    },
  });

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

  const onSubmit = async (values: CreateDatasetFormValues) => {
    setSaveError(undefined);
    setIsSaving(true);
    try {
      const desc = values.description.trim();
      const payload: DataSetWithName = {
        name: values.name.trim(),
        data_source: values.data_source.trim(),
        resource: values.resource.trim(),
        ...(desc ? { description: desc } : {}),
      };
      const message = await onSave(payload);
      if (message) {
        setSaveError(message);
      }
    } catch (error) {
      setSaveError(getFlyoutSaveErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      aria-labelledby="createDatasetFlyoutTitle"
      size="m"
      data-test-subj="createDatasetFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="createDatasetFlyoutTitle">{createDatasetFlyoutStrings.title()}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm component="form" id="createDatasetForm" onSubmit={handleSubmit(onSubmit)}>
          {saveError ? (
            <>
              <EuiText color="danger" size="s" data-test-subj="createDatasetFlyoutSaveError">
                {saveError}
              </EuiText>
              <EuiSpacer size="m" />
            </>
          ) : null}
          <EuiFormRow
            label={createDatasetFlyoutStrings.nameLabel()}
            fullWidth
            isInvalid={Boolean(errors.name)}
            error={errors.name?.message}
          >
            <EuiFieldText
              data-test-subj="createDatasetFlyoutName"
              autoFocus
              fullWidth
              isInvalid={Boolean(errors.name)}
              value={nameField.value}
              onChange={(e) => nameField.onChange(e.target.value)}
              name={nameField.name}
              inputRef={nameField.ref}
            />
          </EuiFormRow>
          <EuiFormRow label={createDatasetFlyoutStrings.descriptionLabel()} fullWidth>
            <EuiTextArea
              data-test-subj="createDatasetFlyoutDescription"
              fullWidth
              rows={4}
              value={descriptionField.value}
              onChange={(e) => descriptionField.onChange(e.target.value)}
              name={descriptionField.name}
              inputRef={descriptionField.ref}
            />
          </EuiFormRow>
          <EuiFormRow
            label={createDatasetFlyoutStrings.dataSourceLabel()}
            fullWidth
            helpText={
              dataSources.length === 0
                ? createDatasetFlyoutStrings.dataSourceEmptyHelp()
                : undefined
            }
            isInvalid={Boolean(errors.data_source)}
            error={errors.data_source?.message}
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
              isInvalid={Boolean(errors.data_source)}
            />
          </EuiFormRow>
          <EuiFormRow
            label={createDatasetFlyoutStrings.resourceLabel()}
            helpText={createDatasetFlyoutStrings.resourceHelp()}
            fullWidth
            isInvalid={Boolean(errors.resource)}
            error={errors.resource?.message}
          >
            <EuiFieldText
              data-test-subj="createDatasetFlyoutResource"
              fullWidth
              autoComplete="off"
              isInvalid={Boolean(errors.resource)}
              value={resourceField.value}
              onChange={(e) => resourceField.onChange(e.target.value)}
              name={resourceField.name}
              inputRef={resourceField.ref}
            />
          </EuiFormRow>
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButtonEmpty data-test-subj="createDatasetFlyoutCancel" onClick={onClose}>
          {createDatasetFlyoutStrings.cancelButton()}
        </EuiButtonEmpty>
        <EuiButton
          fill
          type="submit"
          data-test-subj="createDatasetFlyoutSubmit"
          form="createDatasetForm"
          isLoading={isSaving}
          disabled={isSaving || dataSources.length === 0}
        >
          {createDatasetFlyoutStrings.saveButton()}
        </EuiButton>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
