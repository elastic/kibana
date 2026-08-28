/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiCheckableCard,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { Control } from 'react-hook-form';
import { useController, useForm } from 'react-hook-form';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import type { DataSource, DataSourceWithSecrets } from '../../../common';
import { validateIndexNameRules } from '../../../common';
import { datasetSettingsFieldsWidthCss } from '../../create_dataset_flyout/dataset_settings_fields_layout';
import {
  getDefaultAuthenticationMode,
  applyAuthenticationModeToDataSource,
  type CreateDataSourceAuthenticationMode,
} from '../../create_data_source_flyout/create_data_source_flyout_authentication';
import { CreateDataSourceFlyoutAuthenticationFields } from '../../create_data_source_flyout/create_data_source_flyout_authentication_fields';
import { CreateDataSourceFlyoutAuthenticationSelect } from '../../create_data_source_flyout/create_data_source_flyout_authentication_select';
import { createDataSourceFlyoutStrings } from '../../create_data_source_flyout/create_data_source_flyout_i18n';
import { emptyDataSourceFlyoutFormValues } from '../../create_data_source_flyout/data_source_flyout_initial_values';
import type { CreateDataSourceFlyoutFormValues } from '../../create_data_source_flyout/types';
import type { DataFederationKibanaServices } from '../../types';
import { DataSourceSuperSelect } from '../data_source_super_select';
import { datasetWizardStrings } from '../dataset_wizard_i18n';
import { deriveDataSourceNameFromBucket } from '../derive_data_source_name_from_bucket';
import { findMatchingDataSource } from '../find_matching_data_source';
import { inferRegionFromResource } from '../infer_region_from_resource';
import { parseFileUri } from '../parse_file_uri';

/** Flow 4 is an AWS story for now. */
const DATA_SOURCE_TYPE = 's3' as const;

const CONNECTION_TEST_LOADING_MS = 600;

export type ConnectionTestResult = 'success' | 'warning';

const fullWidthCardCss = css`
  width: 100%;
`;

type DataSourceStepMode = 'existing' | 'new';

export interface DataSourceStepHandle {
  /**
   * Validates the step and, in create mode, creates the data source. Resolves
   * false when the wizard should stay on this step.
   */
  submit: () => Promise<boolean>;
}

export interface DataSourceStepProps {
  /** File URI from the previous step, used to detect the bucket and region. */
  resource: string;
  dataSources: DataSource[];
  selectedDataSource: string;
  onSelectDataSource: (dataSourceName: string) => void;
  onCreateDataSource: (dataSource: DataSourceWithSecrets) => Promise<string | null>;
  /** Lets the wizard footer reflect the outcome of the optional connection test. */
  onConnectionTestResultChange: (result: ConnectionTestResult | undefined) => void;
}

const buildS3DataSource = (
  values: CreateDataSourceFlyoutFormValues,
  authenticationMode: CreateDataSourceAuthenticationMode,
  detectedRegion: string
): DataSourceWithSecrets => {
  const dataSource = applyAuthenticationModeToDataSource(
    {
      ...values,
      name: values.name.trim(),
      type: DATA_SOURCE_TYPE,
      // Unregistering the last settings field of a method drops the whole object.
      settings: values.settings ?? {},
    } as DataSourceWithSecrets,
    authenticationMode
  );

  if (!detectedRegion || dataSource.type !== DATA_SOURCE_TYPE) {
    return dataSource;
  }

  return { ...dataSource, settings: { ...dataSource.settings, region: detectedRegion } };
};

const ConnectionNameField = ({
  control,
  validate,
  onUserChange,
}: {
  control: Control<CreateDataSourceFlyoutFormValues>;
  validate: (value: string) => true | string;
  onUserChange: () => void;
}) => {
  const { field, fieldState } = useController({ name: 'name', control, rules: { validate } });

  return (
    <EuiFormRow
      label={datasetWizardStrings.connectionNameLabel()}
      fullWidth
      isInvalid={Boolean(fieldState.error)}
      error={fieldState.error?.message}
    >
      <EuiFieldText
        data-test-subj="datasetWizardConnectionName"
        fullWidth
        autoComplete="off"
        isInvalid={Boolean(fieldState.error)}
        value={field.value}
        onChange={(event) => {
          onUserChange();
          field.onChange(event.target.value);
        }}
        name={field.name}
        inputRef={field.ref}
      />
    </EuiFormRow>
  );
};

export const DataSourceStep = forwardRef<DataSourceStepHandle, DataSourceStepProps>(
  (
    {
      resource,
      dataSources,
      selectedDataSource,
      onSelectDataSource,
      onCreateDataSource,
      onConnectionTestResultChange,
    },
    ref
  ) => {
    const {
      services: { cloudInfo },
    } = useKibana<DataFederationKibanaServices>();

    const modeGroupName = useGeneratedHtmlId({ prefix: 'datasetWizardDataSourceMode' });
    const existingCardId = useGeneratedHtmlId({ prefix: 'datasetWizardDataSourceModeExisting' });
    const createCardId = useGeneratedHtmlId({ prefix: 'datasetWizardDataSourceModeCreate' });

    const bucket = useMemo(() => parseFileUri(resource)?.bucket ?? '', [resource]);
    const detectedRegion = useMemo(() => inferRegionFromResource(resource), [resource]);

    const typedDataSources = useMemo(
      () => dataSources.filter((dataSource) => dataSource.type === DATA_SOURCE_TYPE),
      [dataSources]
    );
    const existingNames = useMemo(
      () => dataSources.map((dataSource) => dataSource.name),
      [dataSources]
    );
    const matchingDataSource = useMemo(
      () => findMatchingDataSource(dataSources, DATA_SOURCE_TYPE, detectedRegion),
      [dataSources, detectedRegion]
    );

    const [mode, setMode] = useState<DataSourceStepMode>(matchingDataSource ? 'existing' : 'new');
    const [createError, setCreateError] = useState<string | undefined>();
    const [isSelectionInvalid, setIsSelectionInvalid] = useState(false);
    const [connectionTestResult, setConnectionTestResult] = useState<ConnectionTestResult>();
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const isModeChosenByUserRef = useRef(false);
    const isNameSetByUserRef = useRef(false);
    const connectionTestTimeoutRef = useRef<number | undefined>();

    const {
      control: dataSourceControl,
      getValues: getDataSourceValues,
      setValue: setDataSourceValue,
      trigger: triggerDataSource,
      unregister: unregisterDataSource,
      watch: watchDataSource,
    } = useForm<CreateDataSourceFlyoutFormValues>({
      defaultValues: emptyDataSourceFlyoutFormValues(),
    });

    const [authenticationMode, setAuthenticationMode] =
      useState<CreateDataSourceAuthenticationMode>(() =>
        getDefaultAuthenticationMode(DATA_SOURCE_TYPE)
      );

    const clearConnectionTest = useCallback(() => {
      window.clearTimeout(connectionTestTimeoutRef.current);
      connectionTestTimeoutRef.current = undefined;
      setIsTestingConnection(false);
      setConnectionTestResult(undefined);
    }, []);

    const handleTestConnection = useCallback(() => {
      window.clearTimeout(connectionTestTimeoutRef.current);
      setConnectionTestResult(undefined);
      setIsTestingConnection(true);

      connectionTestTimeoutRef.current = window.setTimeout(() => {
        connectionTestTimeoutRef.current = undefined;
        setIsTestingConnection(false);
        setConnectionTestResult(Math.random() < 0.5 ? 'success' : 'warning');
      }, CONNECTION_TEST_LOADING_MS);
    }, []);

    useEffect(() => () => window.clearTimeout(connectionTestTimeoutRef.current), []);

    useEffect(() => {
      onConnectionTestResultChange(connectionTestResult);
    }, [connectionTestResult, onConnectionTestResultChange]);

    // Editing the new connection invalidates whatever the last test proved.
    useEffect(() => {
      const subscription = watchDataSource(() => clearConnectionTest());
      return () => subscription.unsubscribe();
    }, [clearConnectionTest, watchDataSource]);

    const handleAuthenticationModeChange = useCallback(
      (nextAuthenticationMode: CreateDataSourceAuthenticationMode) => {
        clearConnectionTest();
        setAuthenticationMode(nextAuthenticationMode);
      },
      [clearConnectionTest]
    );

    const suggestedName = useMemo(
      () => deriveDataSourceNameFromBucket(bucket, existingNames),
      [bucket, existingNames]
    );

    useEffect(() => {
      if (isNameSetByUserRef.current || !suggestedName) {
        return;
      }

      setDataSourceValue('name', suggestedName);
    }, [setDataSourceValue, suggestedName]);

    // Follow the match as long as the user has not picked a mode themselves.
    useEffect(() => {
      if (isModeChosenByUserRef.current) {
        return;
      }

      setMode(matchingDataSource ? 'existing' : 'new');
    }, [matchingDataSource]);

    useEffect(() => {
      if (mode !== 'existing' || selectedDataSource || !matchingDataSource) {
        return;
      }

      onSelectDataSource(matchingDataSource.name);
    }, [matchingDataSource, mode, onSelectDataSource, selectedDataSource]);

    const handleModeChange = useCallback(
      (nextMode: DataSourceStepMode) => {
        isModeChosenByUserRef.current = true;
        setCreateError(undefined);
        setIsSelectionInvalid(false);
        clearConnectionTest();
        setMode(nextMode);
      },
      [clearConnectionTest]
    );

    const handleSelectDataSource = useCallback(
      (dataSourceName: string) => {
        setIsSelectionInvalid(false);
        clearConnectionTest();
        onSelectDataSource(dataSourceName);
      },
      [clearConnectionTest, onSelectDataSource]
    );

    const validateConnectionName = useCallback(
      (value: string) => {
        const trimmed = value?.trim() ?? '';
        if (!trimmed) {
          return datasetWizardStrings.connectionNameRequired();
        }

        const nameValidation = validateIndexNameRules(trimmed);
        if (nameValidation) {
          return nameValidation.message;
        }

        const isDuplicate = existingNames.some(
          (name) => name.trim().toLowerCase() === trimmed.toLowerCase()
        );

        return isDuplicate ? datasetWizardStrings.connectionNameAlreadyExists() : true;
      },
      [existingNames]
    );

    useImperativeHandle(
      ref,
      () => ({
        submit: async () => {
          setCreateError(undefined);

          if (mode === 'existing') {
            const hasSelection = Boolean(selectedDataSource.trim());
            setIsSelectionInvalid(!hasSelection);
            return hasSelection;
          }

          const isValid = await triggerDataSource();
          if (!isValid) {
            return false;
          }

          const error = await onCreateDataSource(
            buildS3DataSource(getDataSourceValues(), authenticationMode, detectedRegion)
          );

          if (error) {
            setCreateError(error);
            return false;
          }

          // The source now exists and is selected, so returning here shows it as
          // an existing source rather than offering to create it again.
          isModeChosenByUserRef.current = true;
          setMode('existing');
          return true;
        },
      }),
      [
        authenticationMode,
        detectedRegion,
        getDataSourceValues,
        mode,
        onCreateDataSource,
        selectedDataSource,
        triggerDataSource,
      ]
    );

    return (
      <div data-test-subj="datasetWizardDataSourceStep">
        <EuiTitle size="s">
          <h3>{datasetWizardStrings.dataSourceStepTitle()}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <p>{datasetWizardStrings.dataSourceStepDescription()}</p>
        </EuiText>
        <EuiSpacer size="l" />

        {createError ? (
          <>
            <EuiCallOut
              announceOnMount
              color="danger"
              size="s"
              title={createError}
              data-test-subj="datasetWizardDataSourceCreateError"
            />
            <EuiSpacer size="m" />
          </>
        ) : null}

        <div css={datasetSettingsFieldsWidthCss}>
          <fieldset aria-label={datasetWizardStrings.dataSourceModeLegend()}>
            <legend className="euiScreenReaderOnly">
              {datasetWizardStrings.dataSourceModeLegend()}
            </legend>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem>
                <EuiCheckableCard
                  id={existingCardId}
                  name={modeGroupName}
                  css={fullWidthCardCss}
                  label={datasetWizardStrings.dataSourceModeExisting()}
                  data-test-subj="datasetWizardDataSourceModeExisting"
                  disabled={typedDataSources.length === 0}
                  checked={mode === 'existing'}
                  onChange={() => handleModeChange('existing')}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiCheckableCard
                  id={createCardId}
                  name={modeGroupName}
                  css={fullWidthCardCss}
                  label={datasetWizardStrings.dataSourceModeCreate()}
                  data-test-subj="datasetWizardDataSourceModeCreate"
                  checked={mode === 'new'}
                  onChange={() => handleModeChange('new')}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </fieldset>

          <EuiSpacer size="l" />

          {mode === 'existing' ? (
            <EuiForm component="div">
              <EuiFormRow
                label={datasetWizardStrings.dataSourceLabel()}
                fullWidth
                isInvalid={isSelectionInvalid}
                error={
                  isSelectionInvalid
                    ? datasetWizardStrings.dataSourceSelectionRequired()
                    : undefined
                }
              >
                <DataSourceSuperSelect
                  dataSources={typedDataSources}
                  data-test-subj="datasetWizardDataSource"
                  fullWidth
                  aria-label={datasetWizardStrings.dataSourceLabel()}
                  placeholder={datasetWizardStrings.dataSourcePlaceholder()}
                  searchPlaceholder={datasetWizardStrings.dataSourceSearchPlaceholder()}
                  value={selectedDataSource || undefined}
                  onChange={handleSelectDataSource}
                  isInvalid={isSelectionInvalid}
                />
              </EuiFormRow>
            </EuiForm>
          ) : (
            <EuiForm component="div">
              <ConnectionNameField
                control={dataSourceControl}
                validate={validateConnectionName}
                onUserChange={() => {
                  isNameSetByUserRef.current = true;
                }}
              />
              <EuiText size="s" color="subdued" data-test-subj="datasetWizardDataSourceRegionNote">
                <p>
                  {detectedRegion
                    ? datasetWizardStrings.dataSourceRegionDetected(detectedRegion)
                    : datasetWizardStrings.dataSourceRegionDetectedUnknown()}
                </p>
              </EuiText>
              <CreateDataSourceFlyoutAuthenticationSelect
                dataSourceType={DATA_SOURCE_TYPE}
                authenticationMode={authenticationMode}
                onAuthenticationModeChange={handleAuthenticationModeChange}
                leadingSpacerSize="xl"
              />
              <CreateDataSourceFlyoutAuthenticationFields
                authenticationMode={authenticationMode}
                control={dataSourceControl}
                cloudInfo={cloudInfo}
                dataSourceType={DATA_SOURCE_TYPE}
                requireS3Credentials
                requireS3FederatedIdentity
                requireGcsCredentials
                requireGcsFederatedIdentity
                requireAzureCredentials
                unregister={unregisterDataSource}
              />
            </EuiForm>
          )}

          <EuiSpacer size="xl" />

          <EuiFlexGroup responsive={false} alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h3>{datasetWizardStrings.connectionTestTitle()}</h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                data-test-subj="datasetWizardTestConnection"
                isLoading={isTestingConnection}
                disabled={mode === 'existing' && !selectedDataSource.trim()}
                onClick={handleTestConnection}
              >
                {datasetWizardStrings.connectionTestButton()}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>{datasetWizardStrings.connectionTestDescription()}</p>
          </EuiText>

          {connectionTestResult ? (
            <>
              <EuiSpacer size="m" />
              <EuiCallOut
                announceOnMount
                size="s"
                color={connectionTestResult === 'success' ? 'success' : 'warning'}
                iconType={connectionTestResult === 'success' ? 'checkInCircleFilled' : 'warning'}
                title={
                  connectionTestResult === 'success'
                    ? createDataSourceFlyoutStrings.testConnectionSuccessTitle()
                    : datasetWizardStrings.dataSourceSetupWarningTitle()
                }
                data-test-subj={`datasetWizardTestConnectionCallout-${connectionTestResult}`}
              >
                {connectionTestResult === 'success' ? (
                  <p>{createDataSourceFlyoutStrings.testConnectionSuccessMessage()}</p>
                ) : null}
              </EuiCallOut>
            </>
          ) : null}
        </div>
      </div>
    );
  }
);

DataSourceStep.displayName = 'DataSourceStep';
