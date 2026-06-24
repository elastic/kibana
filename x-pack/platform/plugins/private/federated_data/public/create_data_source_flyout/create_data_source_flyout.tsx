/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import type { ToastsStart } from '@kbn/core/public';
import { useController, useForm } from 'react-hook-form';

import type { DataSource, DataSourceWithSecrets } from '../../common/datasource_types';
import { ALL_DATA_SOURCE_TYPES, DATA_SOURCE_TYPES_TO_ICONS } from '../../common';
import type { DataSourceType } from '../../common/datasource_types';
import { getFlyoutSaveErrorMessage } from '../get_flyout_save_error_message';
import { createDataSourceFlyoutStrings } from './create_data_source_flyout_i18n';
import type { DataSourcesClient } from '../data_sources_client';
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
  featureFlags?: {
    enableFederatedIdentityAuth?: boolean;
    enableGoogleCloudStorageDataSourceType?: boolean;
    enableAzureDataSourceType?: boolean;
  };
  dataSourcesClient: DataSourcesClient;
  toasts: ToastsStart;
  onClose: () => void;
  /**
   * Persist a data source (create or update). Resolve `null` on success, or an error message to show in the flyout.
   */
  onSave: (data: DataSourceWithSecrets) => Promise<string | null>;
}

export const CreateDataSourceFlyout: FunctionComponent<CreateDataSourceFlyoutProps> = ({
  initialDataSource,
  existingDataSourceNames = [],
  featureFlags,
  dataSourcesClient,
  toasts,
  onClose,
  onSave,
}) => {
  const enableFederatedIdentityAuth = featureFlags?.enableFederatedIdentityAuth;
  const enableGoogleCloudStorageDataSourceType =
    featureFlags?.enableGoogleCloudStorageDataSourceType;
  const enableAzureDataSourceType = featureFlags?.enableAzureDataSourceType;
  const isEditMode = initialDataSource !== undefined;

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
  const [isTestingConnection, setIsTestingConnection] = useState(false);

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

  const enabledDataSourceTypes = useMemo<readonly DataSourceType[]>(() => {
    const typesToExclude = new Set<DataSourceType>();
    if (!enableGoogleCloudStorageDataSourceType) {
      typesToExclude.add('gcs');
    }
    if (!enableAzureDataSourceType) {
      typesToExclude.add('azure');
    }

    const filtered = ALL_DATA_SOURCE_TYPES.filter((t) => !typesToExclude.has(t));
    return filtered;
  }, [enableAzureDataSourceType, enableGoogleCloudStorageDataSourceType]);

  const dataSourceTypeOptions = useMemo(() => {
    return enabledDataSourceTypes
      .map((value) => ({ value, label: getDataSourceTypeVerbose(value) }))
      .sort((a, b) => a.label.localeCompare(b.label))
      .map(({ value, label }) => {
        const iconType = DATA_SOURCE_TYPES_TO_ICONS[value];
        const display = iconType ? (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type={iconType} size="m" aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{label}</EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          label
        );

        return {
          value,
          inputDisplay: display,
          dropdownDisplay: display,
        };
      });
  }, [enabledDataSourceTypes]);

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

  const onTestConnection = useCallback(
    async (data: CreateDataSourceFlyoutFormValues) => {
      setIsTestingConnection(true);

      const baseName = data.name.trim();
      const testName = `${baseName}_test`;

      const payload = applyAuthenticationModeToDataSource(
        { ...data, name: testName, type: dataSourceType } as DataSourceWithSecrets,
        authenticationMode
      );

      try {
        await dataSourcesClient.add(payload);

        try {
          await dataSourcesClient.getById(testName);
          toasts.addSuccess(createDataSourceFlyoutStrings.testConnectionSuccess());
        } catch (e) {
          toasts.addDanger(
            createDataSourceFlyoutStrings.testConnectionFailed(getFlyoutSaveErrorMessage(e))
          );
        }
      } catch (e) {
        toasts.addDanger(
          createDataSourceFlyoutStrings.testConnectionFailed(getFlyoutSaveErrorMessage(e))
        );
      } finally {
        try {
          await dataSourcesClient.delete(testName);
        } catch {
          // Ignore deletion errors; test data sources are best-effort cleanup.
        }
        setIsTestingConnection(false);
      }
    },
    [authenticationMode, dataSourceType, dataSourcesClient, toasts]
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
      size="m"
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
            <EuiSuperSelect
              options={dataSourceTypeOptions}
              data-test-subj="createDataSourceFlyoutType"
              fullWidth
              aria-label={createDataSourceFlyoutStrings.typeAriaLabel()}
              valueOfSelected={dataSourceType}
              onChange={(value) => setDataSourceType(value as DataSourceType)}
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
          <EuiHorizontalRule margin="m" />
          <CreateDataSourceFlyoutAuthenticationSelect
            authenticationMode={authenticationMode}
            dataSourceType={dataSourceType}
            enableFederatedIdentity={enableFederatedIdentityAuth}
            onAuthenticationModeChange={setAuthenticationMode}
          />
          <CreateDataSourceFlyoutAuthenticationFields
            authenticationMode={authenticationMode}
            control={control}
            dataSourceType={dataSourceType}
            requireS3Credentials={!isEditMode}
            requireS3FederatedIdentity={!isEditMode}
            requireGcsCredentials={!isEditMode}
            requireGcsFederatedIdentity={!isEditMode}
            requireAzureCredentials={!isEditMode}
            unregister={unregister}
          />
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty data-test-subj="createDataSourceFlyoutCancel" onClick={onClose}>
              {createDataSourceFlyoutStrings.cancelButton()}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="createDataSourceFlyoutTestConnection"
                  iconType="play"
                  iconSide="left"
                  type="button"
                  onClick={handleSubmit(onTestConnection)}
                  isLoading={isTestingConnection}
                  disabled={isSaving || isTestingConnection}
                >
                  {createDataSourceFlyoutStrings.testConnectionButton()}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  type="submit"
                  data-test-subj="createDataSourceFlyoutSubmit"
                  onClick={handleSubmit(onSubmit)}
                  isLoading={isSaving}
                  disabled={isSaving || isTestingConnection}
                >
                  {createDataSourceFlyoutStrings.saveButton()}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
