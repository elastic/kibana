/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useEffect, useMemo, useState } from 'react';
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

import type { DataSource, DataSourceWithSecrets } from '../../common/datasource_types';
import { ALL_DATA_SOURCE_TYPES } from '../../common';
import type { DataSourceType } from '../../common/datasource_types';
import { getFlyoutSaveErrorMessage } from '../get_flyout_save_error_message';
import { createDataSourceFlyoutStrings } from './create_data_source_flyout_i18n';
import {
  applyAuthenticationModeToDataSource,
  getDefaultAuthenticationMode,
  type CreateDataSourceAuthenticationMode,
} from './create_data_source_flyout_authentication';
import { CreateDataSourceFlyoutAuthenticationFields } from './create_data_source_flyout_authentication_fields';
import { CreateDataSourceFlyoutAuthenticationSelect } from './create_data_source_flyout_authentication_select';
import { CreateDataSourceFlyoutTypeSettingsBlock } from './create_data_source_flyout_type_settings';
import {
  authenticationModeFromDataSource,
  dataSourceToFlyoutFormValues,
  emptyDataSourceFlyoutFormValues,
} from './data_source_flyout_initial_values';
import { getDataSourceTypeVerbose } from '../get_data_source_type_label';
import type { CreateDataSourceFlyoutFormValues } from './create_data_source_flyout_form_state';

export interface CreateDataSourceFlyoutProps {
  /** When set, the flyout opens in edit mode for this data source. */
  initialDataSource?: DataSource;
  /** Existing names to prevent duplicates (create mode only). */
  existingDataSourceNames?: readonly string[];
  onClose: () => void;
  /**
   * Persist a data source (create or update). Resolve `null` on success, or an error message to show in the flyout.
   */
  onSave: (data: DataSourceWithSecrets) => Promise<string | null>;
}

export const CreateDataSourceFlyout: FunctionComponent<CreateDataSourceFlyoutProps> = ({
  initialDataSource,
  existingDataSourceNames = [],
  onClose,
  onSave,
}) => {
  const isEditMode = initialDataSource !== undefined;

  // todo take a closer look
  const formDefaultValues = useMemo(
    (): CreateDataSourceFlyoutFormValues =>
      initialDataSource
        ? dataSourceToFlyoutFormValues(initialDataSource)
        : emptyDataSourceFlyoutFormValues(),
    [initialDataSource]
  );

  const {
    handleSubmit,
    control,
    reset,
    unregister,
    formState: { errors },
  } = useForm<CreateDataSourceFlyoutFormValues>({
    defaultValues: formDefaultValues,
  });

  const [saveError, setSaveError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  const [dataSourceType, setDataSourceType] = useState<DataSourceType>(
    initialDataSource?.type ?? 's3'
  );

  const { field: nameField } = useController({
    name: 'name',
    control,
    rules: {
      validate: (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) {
          return createDataSourceFlyoutStrings.nameRequired();
        }

        if (isEditMode) {
          return true;
        }

        const normalized = trimmed.toLowerCase();
        const isDuplicate = existingDataSourceNames.some(
          (n) => n.trim().toLowerCase() === normalized
        );
        return isDuplicate ? createDataSourceFlyoutStrings.nameAlreadyExists() : true;
      },
    },
  });
  const { field: descriptionField } = useController({
    name: 'description',
    control,
  });

  const dataSourceTypeOptions = useMemo(
    () =>
      ALL_DATA_SOURCE_TYPES.map((value) => ({
        value,
        text: getDataSourceTypeVerbose(value),
      })).sort((a, b) => a.text.localeCompare(b.text)),
    []
  );

  // todo - is this needed for initial release?
  const [authenticationMode, setAuthenticationMode] = useState<CreateDataSourceAuthenticationMode>(
    () =>
      initialDataSource
        ? authenticationModeFromDataSource(initialDataSource)
        : getDefaultAuthenticationMode(dataSourceType)
  );

  // runs when data source type changes
  useEffect(() => {
    if (!initialDataSource) {
      return;
    }
    reset(dataSourceToFlyoutFormValues(initialDataSource));
    setAuthenticationMode(authenticationModeFromDataSource(initialDataSource));
  }, [initialDataSource, dataSourceType, reset]);

  // when data source type changes, set the authentication mode to the default
  // could likely be merged with above
  useEffect(() => {
    if (!isEditMode) {
      setAuthenticationMode(getDefaultAuthenticationMode(dataSourceType));
    }
  }, [dataSourceType, isEditMode]);

  const handleSave = (data: CreateDataSourceFlyoutFormValues) =>
    onSave(
      // todo - might be able to remove this
      applyAuthenticationModeToDataSource(
        { ...data, type: dataSourceType } as DataSourceWithSecrets,
        authenticationMode
      )
    );

  const onSubmit = async (data: CreateDataSourceFlyoutFormValues) => {
    setSaveError(undefined);
    setIsSaving(true);
    try {
      const message = await handleSave(data);
      if (message) {
        setSaveError(message);
      }
    } catch (error) {
      setSaveError(getFlyoutSaveErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const flyoutTitle = isEditMode
    ? createDataSourceFlyoutStrings.editTitle()
    : createDataSourceFlyoutStrings.createTitle();

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      aria-labelledby="createDataSourceFlyoutTitle"
      size="l"
      data-test-subj={isEditMode ? 'editDataSourceFlyout' : 'createDataSourceFlyout'}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="createDataSourceFlyoutTitle">{flyoutTitle}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm component="form" id="createDataSourceForm" onSubmit={handleSubmit(onSubmit)}>
          {saveError ? (
            <>
              <EuiText color="danger" size="s" data-test-subj="createDataSourceFlyoutSaveError">
                {saveError}
              </EuiText>
              <EuiSpacer size="m" />
            </>
          ) : null}
          <EuiFormRow label={createDataSourceFlyoutStrings.typeLabel()} fullWidth>
            <EuiSelect
              options={dataSourceTypeOptions}
              data-test-subj="createDataSourceFlyoutType"
              fullWidth
              aria-label={createDataSourceFlyoutStrings.typeAriaLabel()}
              value={dataSourceType}
              onChange={(e) => setDataSourceType(e.target.value as DataSourceType)}
              disabled={isEditMode}
            />
          </EuiFormRow>
          <EuiFormRow
            label={createDataSourceFlyoutStrings.nameLabel()}
            isInvalid={Boolean(errors.name)}
            error={errors.name?.message}
            fullWidth
          >
            <EuiFieldText
              isInvalid={Boolean(errors.name)}
              data-test-subj="createDataSourceFlyoutName"
              autoFocus={!isEditMode}
              fullWidth
              value={nameField.value}
              onChange={(e) => nameField.onChange(e.target.value)}
              name={nameField.name}
              inputRef={nameField.ref}
              readOnly={isEditMode}
            />
          </EuiFormRow>
          <EuiFormRow label={createDataSourceFlyoutStrings.descriptionLabel()} fullWidth>
            <EuiTextArea
              data-test-subj="createDataSourceFlyoutDescription"
              fullWidth
              rows={1}
              value={descriptionField.value}
              onChange={(e) => descriptionField.onChange(e.target.value)}
              name={descriptionField.name}
              inputRef={descriptionField.ref}
            />
          </EuiFormRow>
          <CreateDataSourceFlyoutTypeSettingsBlock
            control={control}
            dataSourceType={dataSourceType}
            unregister={unregister}
          />
          <CreateDataSourceFlyoutAuthenticationSelect
            authenticationMode={authenticationMode}
            dataSourceType={dataSourceType}
            onAuthenticationModeChange={setAuthenticationMode}
          />
          <CreateDataSourceFlyoutAuthenticationFields
            authenticationMode={authenticationMode}
            control={control}
            dataSourceType={dataSourceType}
            requireS3Credentials={!isEditMode}
            requireGcsCredentials={!isEditMode}
            requireAzureCredentials={!isEditMode}
            unregister={unregister}
          />
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButtonEmpty data-test-subj="createDataSourceFlyoutCancel" onClick={onClose}>
          {createDataSourceFlyoutStrings.cancelButton()}
        </EuiButtonEmpty>
        <EuiButton
          fill
          type="submit"
          data-test-subj="createDataSourceFlyoutSubmit"
          onClick={handleSubmit(onSubmit)}
          isLoading={isSaving}
          disabled={isSaving}
        >
          {createDataSourceFlyoutStrings.saveButton()}
        </EuiButton>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
