/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EuiStepStatus } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageSection,
  EuiSpacer,
  EuiStepsHorizontal,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useForm } from 'react-hook-form';
import { useHistory, useLocation } from 'react-router-dom';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import type { DataSetWithName, DataSource, DataSourceWithSecrets } from '../../common';
import { validateIndexNameRules } from '../../common';
import { CreateDataSourceFlyout } from '../create_data_source_flyout';
import { applyCustomJsonToFormSettings } from '../create_dataset_flyout/settings_custom_json_utils';
import { buildDatasetPayloadFromWizardValues } from './review_step_utils';
import {
  extractFlyoutSaveErrorMessage,
  formatFlyoutSaveErrorForCallout,
} from '../get_flyout_save_error_message';
import type { DataFederationKibanaServices } from '../types';
import { useDataSourceConnectionCheck } from '../use_data_source_connection_check';
import {
  ADDITIONAL_SETTINGS_STEP,
  DATA_SOURCE_STEP,
  DATASET_WIZARD_FORM_MAX_WIDTH,
  LOGISTICS_STEP,
  PREVIEW_RESULTS_STEP,
  REVIEW_STEP,
  SCHEMA_MAPPINGS_STEP,
} from './dataset_wizard_constants';
import { datasetWizardStrings } from './dataset_wizard_i18n';
import type { DatasetWizardFormValues } from './dataset_wizard_form_state';
import {
  buildWizardStepSearch,
  getNextWizardStep,
  getPreviousWizardStep,
  getReviewStep,
  isWizardStepAfter,
  parseWizardStepFromSearch,
  type DatasetWizardStep,
} from './dataset_wizard_step_url';
import {
  clearWizardFormDraft,
  getWizardFormDraftStorageKey,
  saveWizardFormDraft,
} from './dataset_wizard_form_persistence';
import { findFirstInvalidWizardStep, getWizardStepFields } from './dataset_wizard_step_validation';
import { validateResourceForDataSource } from './validate_dataset_resource';
import { inferRegionFromResource } from './infer_region_from_resource';
import { LogisticsStep } from './steps/logistics_step';
import {
  DataSourceStep,
  type ConnectionTestResult,
  type DataSourceStepHandle,
} from './steps/data_source_step';
import { AdditionalSettingsStep } from './steps/additional_settings_step';
import { SchemaMappingsStep } from './steps/schema_mappings_step';
import { ReviewStep } from './steps/review_step';
import { PreviewResultsStep } from './steps/preview_results_step';
import {
  DATASET_WIZARD_FLOW_VARIANT_1,
  hasDatasetWizardPreviewResultsStep,
  isDatasetWizardFlow3,
  isDatasetWizardFlow4,
  type DatasetWizardFlowVariant,
} from './dataset_wizard_flow_variant';
import { TestConfigurationPreview } from './test_configuration_preview';

const TEST_CONFIGURATION_LOADING_MS = 600;
const TEST_CONFIGURATION_STEPS: DatasetWizardStep[] = [SCHEMA_MAPPINGS_STEP, REVIEW_STEP];

const getInitialRegionSelectionSource = (
  resource: string,
  region: string
): 'none' | 'auto' | 'manual' => {
  const inferredRegion = inferRegionFromResource(resource);
  if (inferredRegion && region === inferredRegion) {
    return 'auto';
  }

  return region ? 'manual' : 'none';
};

export interface DatasetWizardProps {
  isEditMode: boolean;
  initialDataSet?: DataSetWithName;
  existingDataSetNames: readonly string[];
  dataSources: DataSource[];
  defaultValues: DatasetWizardFormValues;
  flowVariant: DatasetWizardFlowVariant;
  reloadDataSources: () => Promise<void>;
  onCancel: () => void;
  onSave: (data: DataSetWithName, previousId?: string) => Promise<string | null>;
}

export const DatasetWizard: FunctionComponent<DatasetWizardProps> = ({
  isEditMode,
  initialDataSet,
  existingDataSetNames,
  dataSources,
  defaultValues,
  flowVariant,
  reloadDataSources,
  onCancel,
  onSave,
}) => {
  const {
    services: { dataSourcesClient },
  } = useKibana<DataFederationKibanaServices>();
  const { euiTheme } = useEuiTheme();
  const history = useHistory();
  const location = useLocation();
  const footerCss = useMemo(
    () => css`
      position: sticky;
      bottom: 0;
      z-index: 1;
      background-color: ${euiTheme.colors.backgroundBasePlain};
    `,
    [euiTheme.colors.backgroundBasePlain]
  );
  const draftStorageKey = useMemo(
    () => getWizardFormDraftStorageKey(isEditMode, initialDataSet?.name),
    [initialDataSet?.name, isEditMode]
  );

  const initialIdNormalized = initialDataSet?.name?.trim().toLowerCase() ?? '';
  const [currentStep, setCurrentStep] = useState<DatasetWizardStep>(
    () => parseWizardStepFromSearch(location.search, flowVariant) ?? LOGISTICS_STEP
  );
  const [saveError, setSaveError] = useState<string | undefined>();
  const saveErrorCallout = useMemo(
    () => (saveError ? formatFlyoutSaveErrorForCallout(saveError) : undefined),
    [saveError]
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isCreateDataSourceFlyoutOpen, setIsCreateDataSourceFlyoutOpen] = useState(false);
  const dataSourceStepRef = useRef<DataSourceStepHandle>(null);
  const [connectionTestResult, setConnectionTestResult] = useState<ConnectionTestResult>();
  const [isTestConfigPanelOpen, setIsTestConfigPanelOpen] = useState(false);
  const [isTestConfigLoading, setIsTestConfigLoading] = useState(false);
  const additionalSettingsSyncedResourceRef = useRef<string | null>(null);
  const testConfigLoadingTimeoutRef = useRef<number | undefined>();
  const regionSelectionSourceRef = useRef(
    getInitialRegionSelectionSource(defaultValues.resource, defaultValues.region)
  );
  const [autoDetectedRegion, setAutoDetectedRegion] = useState(() => {
    const inferredRegion = inferRegionFromResource(defaultValues.resource);
    return inferredRegion && defaultValues.region === inferredRegion ? inferredRegion : '';
  });
  const isFlow1 = flowVariant === DATASET_WIZARD_FLOW_VARIANT_1;
  const isFlow3 = isDatasetWizardFlow3(flowVariant);
  const isFlow4 = isDatasetWizardFlow4(flowVariant);
  const hasPreviewResultsStep = hasDatasetWizardPreviewResultsStep(flowVariant);
  const reviewStep = getReviewStep(flowVariant);

  const { control, getValues, setValue, trigger, watch } = useForm<DatasetWizardFormValues>({
    defaultValues,
    mode: 'onChange',
    shouldUnregister: false,
  });

  const wizardFormValues = watch();
  const watchedDataSource = wizardFormValues.data_source;
  const watchedName = wizardFormValues.name;
  const watchedResource = wizardFormValues.resource;
  const watchedRegion = wizardFormValues.region;

  const syncRegionFromResource = useCallback(
    (resource: string, dataSourceName: string) => {
      const selectedDataSource = dataSources.find(
        (dataSource) => dataSource.name === dataSourceName
      );
      if (selectedDataSource && selectedDataSource.type !== 's3') {
        return;
      }

      const inferredRegion = inferRegionFromResource(resource);
      if (inferredRegion) {
        setAutoDetectedRegion(inferredRegion);
        if (regionSelectionSourceRef.current !== 'manual') {
          regionSelectionSourceRef.current = 'auto';
          setValue('region', inferredRegion, { shouldDirty: true, shouldValidate: true });
        }
        return;
      }

      setAutoDetectedRegion('');
      if (regionSelectionSourceRef.current === 'auto') {
        regionSelectionSourceRef.current = 'none';
      }
    },
    [dataSources, setValue]
  );

  const handleRegionManualChange = useCallback((regionId: string) => {
    regionSelectionSourceRef.current = 'manual';
    setAutoDetectedRegion((current) => (regionId !== current ? '' : current));
  }, []);

  useEffect(() => {
    const subscription = watch((values) => {
      saveWizardFormDraft(draftStorageKey, values as DatasetWizardFormValues);
    });

    return () => subscription.unsubscribe();
  }, [draftStorageKey, watch]);

  const handleCancel = useCallback(() => {
    clearWizardFormDraft(draftStorageKey);
    onCancel();
  }, [draftStorageKey, onCancel]);

  const existingDataSourceNames = useMemo(
    () => dataSources.map((dataSource) => dataSource.name),
    [dataSources]
  );

  // The wizard has no status column to check in, so the check announces itself in a toast.
  const { startConnectionCheck } = useDataSourceConnectionCheck({ showProgressToast: true });

  const openCreateDataSourceFlyout = useCallback(() => {
    setIsCreateDataSourceFlyoutOpen(true);
  }, []);

  const closeCreateDataSourceFlyout = useCallback(() => {
    setIsCreateDataSourceFlyoutOpen(false);
  }, []);

  const createDataSource = useCallback(
    async (dataSource: DataSourceWithSecrets): Promise<string | null> => {
      try {
        await dataSourcesClient.add(dataSource);
        await reloadDataSources();
        setValue('data_source', dataSource.name.trim(), {
          shouldValidate: true,
          shouldDirty: true,
        });
        return null;
      } catch (error) {
        return extractFlyoutSaveErrorMessage(error);
      }
    },
    [dataSourcesClient, reloadDataSources, setValue]
  );

  const onSaveDataSource = useCallback(
    async (dataSource: DataSourceWithSecrets): Promise<string | null> => {
      const error = await createDataSource(dataSource);
      if (!error) {
        setIsCreateDataSourceFlyoutOpen(false);
        void startConnectionCheck(dataSource.name.trim());
      }

      return error;
    },
    [createDataSource, startConnectionCheck]
  );

  const handleSelectDataSource = useCallback(
    (dataSourceName: string) => {
      setValue('data_source', dataSourceName, { shouldValidate: true, shouldDirty: true });
    },
    [setValue]
  );

  const validateName = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return datasetWizardStrings.nameRequired();
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
      return isDuplicate ? datasetWizardStrings.nameAlreadyExists() : true;
    },
    [existingDataSetNames, initialIdNormalized, isEditMode]
  );

  const logisticsStepComplete = useMemo(() => {
    const dataSource = watchedDataSource?.trim() ?? '';
    const name = watchedName?.trim() ?? '';
    const resource = watchedResource?.trim() ?? '';
    const region = watchedRegion?.trim() ?? '';

    // Flow 4 asks only for the file URI on step 1; the data source moves to its
    // own step.
    if (isFlow4) {
      return Boolean(resource);
    }

    if (!dataSource || !name || !resource || (!isFlow3 && !region)) {
      return false;
    }

    if (validateName(name) !== true) {
      return false;
    }

    return validateResourceForDataSource(resource, dataSource, dataSources) === true;
  }, [
    dataSources,
    isFlow3,
    isFlow4,
    validateName,
    watchedDataSource,
    watchedName,
    watchedRegion,
    watchedResource,
  ]);

  useEffect(() => {
    if (!isFlow1) {
      return;
    }

    setIsTestConfigPanelOpen(false);
    setIsTestConfigLoading(false);

    if (testConfigLoadingTimeoutRef.current !== undefined) {
      window.clearTimeout(testConfigLoadingTimeoutRef.current);
      testConfigLoadingTimeoutRef.current = undefined;
    }
  }, [currentStep, isFlow1]);

  useEffect(
    () => () => {
      if (testConfigLoadingTimeoutRef.current !== undefined) {
        window.clearTimeout(testConfigLoadingTimeoutRef.current);
      }
    },
    []
  );

  const clearTestConfigLoadingTimeout = useCallback(() => {
    if (testConfigLoadingTimeoutRef.current !== undefined) {
      window.clearTimeout(testConfigLoadingTimeoutRef.current);
      testConfigLoadingTimeoutRef.current = undefined;
    }
  }, []);

  const handleCloseTestConfiguration = useCallback(() => {
    setIsTestConfigPanelOpen(false);
    setIsTestConfigLoading(false);
    clearTestConfigLoadingTimeout();
  }, [clearTestConfigLoadingTimeout]);

  const handleTestConfiguration = useCallback(() => {
    setIsTestConfigPanelOpen(true);
    setIsTestConfigLoading(true);
    clearTestConfigLoadingTimeout();

    testConfigLoadingTimeoutRef.current = window.setTimeout(() => {
      setIsTestConfigLoading(false);
      testConfigLoadingTimeoutRef.current = undefined;
    }, TEST_CONFIGURATION_LOADING_MS);
  }, [clearTestConfigLoadingTimeout]);

  useEffect(() => {
    const stepFromUrl = parseWizardStepFromSearch(location.search, flowVariant) ?? LOGISTICS_STEP;

    if (stepFromUrl === LOGISTICS_STEP) {
      setCurrentStep(LOGISTICS_STEP);
      return;
    }

    let isCancelled = false;

    const syncStepFromUrl = async () => {
      const values = getValues();
      const firstInvalidStep = await findFirstInvalidWizardStep({
        targetStep: stepFromUrl,
        values,
        trigger,
        flowVariant,
      });

      if (isCancelled) {
        return;
      }

      const nextStep = firstInvalidStep ?? stepFromUrl;
      setCurrentStep(nextStep);

      if (nextStep !== stepFromUrl) {
        history.replace({
          pathname: location.pathname,
          search: buildWizardStepSearch(location.search, nextStep, flowVariant),
        });
      }
    };

    void syncStepFromUrl();

    return () => {
      isCancelled = true;
    };
  }, [
    flowVariant,
    getValues,
    hasPreviewResultsStep,
    history,
    location.pathname,
    location.search,
    trigger,
  ]);

  const isStepDisabled = useCallback(
    (step: DatasetWizardStep) =>
      !logisticsStepComplete && isWizardStepAfter(step, currentStep, flowVariant),
    [currentStep, flowVariant, logisticsStepComplete]
  );

  const goToStep = useCallback(
    (step: DatasetWizardStep) => {
      setCurrentStep(step);
      history.replace({
        pathname: location.pathname,
        search: buildWizardStepSearch(location.search, step, flowVariant),
      });
    },
    [flowVariant, history, location.pathname, location.search]
  );

  const persistCustomJsonToForm = useCallback(() => {
    if (!isDatasetWizardFlow3(flowVariant)) {
      return;
    }

    const values = getValues();
    const nextSettings = applyCustomJsonToFormSettings(
      values.settings,
      values.settings_custom_json
    );

    (Object.keys(nextSettings) as Array<keyof typeof nextSettings>).forEach((key) => {
      if (values.settings[key] === nextSettings[key]) {
        return;
      }

      setValue(`settings.${key}`, nextSettings[key], { shouldDirty: true, shouldValidate: true });
    });
  }, [flowVariant, getValues, setValue]);

  const attemptGoToStep = useCallback(
    async (targetStep: DatasetWizardStep) => {
      setSaveError(undefined);

      if (!isWizardStepAfter(targetStep, currentStep, flowVariant)) {
        goToStep(targetStep);
        return;
      }

      if (currentStep === ADDITIONAL_SETTINGS_STEP) {
        persistCustomJsonToForm();
      }

      const values = getValues();
      const firstInvalidStep = await findFirstInvalidWizardStep({
        targetStep,
        values,
        trigger,
        flowVariant,
      });

      if (firstInvalidStep !== undefined) {
        goToStep(firstInvalidStep);
        return;
      }

      goToStep(targetStep);
    },
    [currentStep, flowVariant, getValues, goToStep, persistCustomJsonToForm, trigger]
  );

  const stepDefinitions = useMemo(
    () => [
      {
        title: isFlow4 ? datasetWizardStrings.stepFile() : datasetWizardStrings.stepLogistics(),
        status: (currentStep === LOGISTICS_STEP
          ? 'current'
          : logisticsStepComplete
          ? 'complete'
          : 'incomplete') as EuiStepStatus,
        onClick: () => void attemptGoToStep(LOGISTICS_STEP),
      },
      ...(isFlow4
        ? [
            {
              title: datasetWizardStrings.stepDataSource(),
              disabled: isStepDisabled(DATA_SOURCE_STEP),
              status: (currentStep === DATA_SOURCE_STEP
                ? 'current'
                : isWizardStepAfter(currentStep, DATA_SOURCE_STEP, flowVariant)
                ? 'complete'
                : 'incomplete') as EuiStepStatus,
              onClick: () => void attemptGoToStep(DATA_SOURCE_STEP),
            },
          ]
        : []),
      {
        title: datasetWizardStrings.stepAdditionalSettings(),
        disabled: isStepDisabled(ADDITIONAL_SETTINGS_STEP),
        status: (currentStep === ADDITIONAL_SETTINGS_STEP
          ? 'current'
          : isWizardStepAfter(currentStep, ADDITIONAL_SETTINGS_STEP, flowVariant)
          ? 'complete'
          : 'incomplete') as EuiStepStatus,
        onClick: () => void attemptGoToStep(ADDITIONAL_SETTINGS_STEP),
      },
      {
        title: datasetWizardStrings.stepSchemaMappings(),
        disabled: isStepDisabled(SCHEMA_MAPPINGS_STEP),
        status: (currentStep === SCHEMA_MAPPINGS_STEP
          ? 'current'
          : isWizardStepAfter(currentStep, SCHEMA_MAPPINGS_STEP, flowVariant)
          ? 'complete'
          : 'incomplete') as EuiStepStatus,
        onClick: () => void attemptGoToStep(SCHEMA_MAPPINGS_STEP),
      },
      ...(hasPreviewResultsStep
        ? [
            {
              title: datasetWizardStrings.stepPreviewResults(),
              disabled: isStepDisabled(PREVIEW_RESULTS_STEP),
              status: (currentStep === PREVIEW_RESULTS_STEP
                ? 'current'
                : isWizardStepAfter(currentStep, PREVIEW_RESULTS_STEP, flowVariant)
                ? 'complete'
                : 'incomplete') as EuiStepStatus,
              onClick: () => void attemptGoToStep(PREVIEW_RESULTS_STEP),
            },
          ]
        : []),
      {
        title: datasetWizardStrings.stepReview(),
        disabled: isStepDisabled(reviewStep),
        status: (currentStep === reviewStep ? 'current' : 'incomplete') as EuiStepStatus,
        onClick: () => void attemptGoToStep(reviewStep),
      },
    ],
    [
      attemptGoToStep,
      currentStep,
      flowVariant,
      hasPreviewResultsStep,
      isFlow4,
      isStepDisabled,
      logisticsStepComplete,
      reviewStep,
    ]
  );

  const handleNext = async () => {
    setSaveError(undefined);

    if (currentStep === ADDITIONAL_SETTINGS_STEP) {
      persistCustomJsonToForm();
    }

    if (currentStep === LOGISTICS_STEP) {
      const logisticsValues = getValues();
      syncRegionFromResource(logisticsValues.resource, logisticsValues.data_source);
    }

    const values = getValues();
    const fields = getWizardStepFields(currentStep, values, flowVariant);
    const isValid = await trigger(fields, { shouldFocus: true });

    if (!isValid) {
      return;
    }

    if (currentStep === DATA_SOURCE_STEP) {
      const isDataSourceReady = await dataSourceStepRef.current?.submit();
      if (!isDataSourceReady) {
        return;
      }
    }

    const nextStep = getNextWizardStep(currentStep, flowVariant);
    if (nextStep !== undefined) {
      goToStep(nextStep);
    }
  };

  const handleBack = () => {
    const previousStep = getPreviousWizardStep(currentStep, flowVariant);
    if (previousStep !== undefined) {
      goToStep(previousStep);
    }
  };

  const handleSubmit = async () => {
    setSaveError(undefined);
    persistCustomJsonToForm();

    const values = getValues();
    const firstInvalidStep = await findFirstInvalidWizardStep({
      targetStep: reviewStep,
      values,
      trigger,
      flowVariant,
    });

    if (firstInvalidStep !== undefined) {
      goToStep(firstInvalidStep);
      return;
    }

    setIsSaving(true);
    try {
      const payload = buildDatasetPayloadFromWizardValues(values);
      const message = await onSave(payload, initialDataSet?.name);
      if (message) {
        setSaveError(message);
      } else {
        clearWizardFormDraft(draftStorageKey);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const showBackButton = currentStep !== LOGISTICS_STEP;
  const isLastStep = currentStep === reviewStep;
  const nextButtonLabel =
    currentStep === DATA_SOURCE_STEP
      ? connectionTestResult === 'warning'
        ? datasetWizardStrings.saveAndContinueAnywaysButton()
        : datasetWizardStrings.saveAndContinueButton()
      : datasetWizardStrings.nextButton();
  const showTestConfiguration = isFlow1 && TEST_CONFIGURATION_STEPS.includes(currentStep);

  const renderStepContent = () => (
    <>
      <div hidden={currentStep !== LOGISTICS_STEP}>
        <LogisticsStep
          control={control}
          dataSources={dataSources}
          onConnectNewDataSource={openCreateDataSourceFlyout}
          validateName={validateName}
          getValues={getValues}
          setValue={setValue}
          flowVariant={flowVariant}
          syncRegionFromResource={syncRegionFromResource}
          autoDetectedRegion={autoDetectedRegion}
          onRegionManualChange={handleRegionManualChange}
          isEditMode={isEditMode}
          syncedResourceRef={additionalSettingsSyncedResourceRef}
        />
      </div>
      {isFlow4 ? (
        <div hidden={currentStep !== DATA_SOURCE_STEP}>
          <DataSourceStep
            ref={dataSourceStepRef}
            resource={watchedResource ?? ''}
            dataSources={dataSources}
            selectedDataSource={watchedDataSource ?? ''}
            onSelectDataSource={handleSelectDataSource}
            onCreateDataSource={createDataSource}
            onConnectionTestResultChange={setConnectionTestResult}
          />
        </div>
      ) : null}
      <div hidden={currentStep !== ADDITIONAL_SETTINGS_STEP}>
        <AdditionalSettingsStep
          control={control}
          getValues={getValues}
          setValue={setValue}
          resource={watchedResource ?? ''}
          syncedResourceRef={additionalSettingsSyncedResourceRef}
          isEditMode={isEditMode}
          flowVariant={flowVariant}
          autoDetectedRegion={autoDetectedRegion}
          onRegionManualChange={handleRegionManualChange}
        />
      </div>
      <div hidden={currentStep !== SCHEMA_MAPPINGS_STEP}>
        <SchemaMappingsStep
          control={control}
          dataSources={dataSources}
          dataSource={watchedDataSource ?? ''}
          dataSourceRegion={watchedRegion ?? ''}
          flowVariant={flowVariant}
        />
      </div>
      {hasPreviewResultsStep ? (
        <div hidden={currentStep !== PREVIEW_RESULTS_STEP}>
          <PreviewResultsStep
            values={wizardFormValues}
            isActive={currentStep === PREVIEW_RESULTS_STEP}
          />
        </div>
      ) : null}
      <div hidden={currentStep !== reviewStep}>
        <ReviewStep values={wizardFormValues} dataSources={dataSources} flowVariant={flowVariant} />
      </div>
    </>
  );

  return (
    <>
      <EuiPageSection restrictWidth={DATASET_WIZARD_FORM_MAX_WIDTH} data-test-subj="datasetWizard">
        <EuiStepsHorizontal steps={stepDefinitions} />
        <EuiSpacer size="xl" />

        <div data-test-subj="datasetWizardStepContent">{renderStepContent()}</div>

        {showTestConfiguration && isTestConfigPanelOpen ? (
          <>
            <EuiSpacer size="l" />
            <TestConfigurationPreview
              values={getValues()}
              isLoading={isTestConfigLoading}
              onClose={handleCloseTestConfiguration}
            />
          </>
        ) : null}

        {saveErrorCallout ? (
          <>
            <EuiSpacer size="l" />
            <EuiCallOut
              announceOnMount
              color="danger"
              size="s"
              title={saveErrorCallout.title}
              data-test-subj="datasetWizardSaveError"
            >
              <p>{saveErrorCallout.body}</p>
            </EuiCallOut>
          </>
        ) : null}

        <div css={footerCss} data-test-subj="datasetWizardFooter">
          <EuiSpacer size={isFlow3 ? 'xxl' : 'xl'} />
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
            {isFlow3 ? null : (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty data-test-subj="datasetWizardCancel" onClick={handleCancel}>
                  {datasetWizardStrings.cancelButton()}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" responsive={false}>
                {showBackButton ? (
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      iconType={isFlow3 ? 'chevronSingleLeft' : undefined}
                      data-test-subj="datasetWizardBack"
                      onClick={handleBack}
                    >
                      {datasetWizardStrings.backButton()}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                ) : null}
                {!isFlow3 && showTestConfiguration ? (
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      data-test-subj="datasetWizardTestConfiguration"
                      isLoading={isTestConfigLoading}
                      onClick={handleTestConfiguration}
                    >
                      {datasetWizardStrings.testConfigurationButton()}
                    </EuiButton>
                  </EuiFlexItem>
                ) : null}
                <EuiFlexItem grow={false}>
                  {isLastStep ? (
                    <EuiButton
                      fill
                      data-test-subj="datasetWizardSubmit"
                      isLoading={isSaving}
                      disabled={isSaving}
                      onClick={() => void handleSubmit()}
                    >
                      {isEditMode
                        ? datasetWizardStrings.saveButton()
                        : datasetWizardStrings.addButton()}
                    </EuiButton>
                  ) : (
                    <EuiButton
                      fill
                      iconType={isFlow3 ? 'chevronSingleRight' : undefined}
                      iconSide={isFlow3 ? 'right' : undefined}
                      data-test-subj="datasetWizardNext"
                      onClick={() => void handleNext()}
                    >
                      {nextButtonLabel}
                    </EuiButton>
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            {isFlow3 && showTestConfiguration ? (
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="datasetWizardTestConfiguration"
                  isLoading={isTestConfigLoading}
                  onClick={handleTestConfiguration}
                >
                  {datasetWizardStrings.testConfigurationButton()}
                </EuiButton>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
          {isFlow3 ? <EuiSpacer size="m" /> : null}
        </div>
      </EuiPageSection>
      {isCreateDataSourceFlyoutOpen ? (
        <CreateDataSourceFlyout
          existingDataSourceNames={existingDataSourceNames}
          onClose={closeCreateDataSourceFlyout}
          onSave={onSaveDataSource}
        />
      ) : null}
    </>
  );
};
