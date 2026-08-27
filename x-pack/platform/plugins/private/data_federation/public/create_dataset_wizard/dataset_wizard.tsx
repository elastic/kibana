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
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageSection,
  EuiSpacer,
  EuiStepsHorizontal,
  EuiText,
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
import { getFlyoutSaveErrorMessage } from '../get_flyout_save_error_message';
import type { DataFederationKibanaServices } from '../types';
import {
  ADDITIONAL_SETTINGS_STEP,
  DATASET_WIZARD_FORM_MAX_WIDTH,
  FLOW_3_REVIEW_STEP,
  LOGISTICS_STEP,
  PREVIEW_RESULTS_STEP,
  REVIEW_STEP,
  SCHEMA_MAPPINGS_STEP,
} from './dataset_wizard_constants';
import { datasetWizardStrings } from './dataset_wizard_i18n';
import type { DatasetWizardFormValues } from './dataset_wizard_form_state';
import {
  buildWizardStepSearch,
  getReviewStep,
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
import { AdditionalSettingsStep } from './steps/additional_settings_step';
import { SchemaMappingsStep } from './steps/schema_mappings_step';
import { ReviewStep } from './steps/review_step';
import { PreviewResultsStep } from './steps/preview_results_step';
import {
  DATASET_WIZARD_FLOW_VARIANT_1,
  isDatasetWizardFlow3,
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
    () => parseWizardStepFromSearch(location.search) ?? LOGISTICS_STEP
  );
  const [saveError, setSaveError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [isCreateDataSourceFlyoutOpen, setIsCreateDataSourceFlyoutOpen] = useState(false);
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

  const openCreateDataSourceFlyout = useCallback(() => {
    setIsCreateDataSourceFlyoutOpen(true);
  }, []);

  const closeCreateDataSourceFlyout = useCallback(() => {
    setIsCreateDataSourceFlyoutOpen(false);
  }, []);

  const onSaveDataSource = useCallback(
    async (dataSource: DataSourceWithSecrets): Promise<string | null> => {
      try {
        await dataSourcesClient.add(dataSource);
        await reloadDataSources();
        setValue('data_source', dataSource.name.trim(), {
          shouldValidate: true,
          shouldDirty: true,
        });
        setIsCreateDataSourceFlyoutOpen(false);
        return null;
      } catch (error) {
        return getFlyoutSaveErrorMessage(error);
      }
    },
    [dataSourcesClient, reloadDataSources, setValue]
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
    const stepFromUrl = parseWizardStepFromSearch(location.search) ?? LOGISTICS_STEP;
    const normalizedStepFromUrl =
      !isFlow3 && stepFromUrl === FLOW_3_REVIEW_STEP ? REVIEW_STEP : stepFromUrl;

    if (normalizedStepFromUrl === LOGISTICS_STEP) {
      setCurrentStep(LOGISTICS_STEP);
      return;
    }

    let isCancelled = false;

    const syncStepFromUrl = async () => {
      const values = getValues();
      const firstInvalidStep = await findFirstInvalidWizardStep({
        targetStep: normalizedStepFromUrl,
        values,
        trigger,
        flowVariant,
      });

      if (isCancelled) {
        return;
      }

      const nextStep = firstInvalidStep ?? normalizedStepFromUrl;
      setCurrentStep(nextStep);

      if (nextStep !== stepFromUrl) {
        history.replace({
          pathname: location.pathname,
          search: buildWizardStepSearch(location.search, nextStep),
        });
      }
    };

    void syncStepFromUrl();

    return () => {
      isCancelled = true;
    };
  }, [flowVariant, getValues, history, isFlow3, location.pathname, location.search, trigger]);

  const isStepDisabled = useCallback(
    (step: DatasetWizardStep) => !logisticsStepComplete && currentStep < step,
    [currentStep, logisticsStepComplete]
  );

  const goToStep = useCallback(
    (step: DatasetWizardStep) => {
      setCurrentStep(step);
      history.replace({
        pathname: location.pathname,
        search: buildWizardStepSearch(location.search, step),
      });
    },
    [history, location.pathname, location.search]
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

      if (targetStep <= currentStep) {
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
        step: LOGISTICS_STEP,
        title: datasetWizardStrings.stepLogistics(),
        status: (currentStep === LOGISTICS_STEP
          ? 'current'
          : logisticsStepComplete
          ? 'complete'
          : 'incomplete') as EuiStepStatus,
        onClick: () => void attemptGoToStep(LOGISTICS_STEP),
      },
      {
        step: ADDITIONAL_SETTINGS_STEP,
        title: datasetWizardStrings.stepAdditionalSettings(),
        disabled: isStepDisabled(ADDITIONAL_SETTINGS_STEP),
        status: (currentStep === ADDITIONAL_SETTINGS_STEP
          ? 'current'
          : currentStep > ADDITIONAL_SETTINGS_STEP
          ? 'complete'
          : 'incomplete') as EuiStepStatus,
        onClick: () => void attemptGoToStep(ADDITIONAL_SETTINGS_STEP),
      },
      {
        step: SCHEMA_MAPPINGS_STEP,
        title: datasetWizardStrings.stepSchemaMappings(),
        disabled: isStepDisabled(SCHEMA_MAPPINGS_STEP),
        status: (currentStep === SCHEMA_MAPPINGS_STEP
          ? 'current'
          : currentStep > SCHEMA_MAPPINGS_STEP
          ? 'complete'
          : 'incomplete') as EuiStepStatus,
        onClick: () => void attemptGoToStep(SCHEMA_MAPPINGS_STEP),
      },
      ...(isFlow3
        ? [
            {
              step: PREVIEW_RESULTS_STEP,
              title: datasetWizardStrings.stepPreviewResults(),
              disabled: isStepDisabled(PREVIEW_RESULTS_STEP),
              status: (currentStep === PREVIEW_RESULTS_STEP
                ? 'current'
                : currentStep > PREVIEW_RESULTS_STEP
                ? 'complete'
                : 'incomplete') as EuiStepStatus,
              onClick: () => void attemptGoToStep(PREVIEW_RESULTS_STEP),
            },
          ]
        : []),
      {
        step: reviewStep,
        title: datasetWizardStrings.stepReview(),
        disabled: isStepDisabled(reviewStep),
        status: (currentStep === reviewStep ? 'current' : 'incomplete') as EuiStepStatus,
        onClick: () => void attemptGoToStep(reviewStep),
      },
    ],
    [attemptGoToStep, currentStep, isFlow3, isStepDisabled, logisticsStepComplete, reviewStep]
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

    if (currentStep === LOGISTICS_STEP) {
      goToStep(ADDITIONAL_SETTINGS_STEP);
      return;
    }

    if (currentStep === ADDITIONAL_SETTINGS_STEP) {
      goToStep(SCHEMA_MAPPINGS_STEP);
      return;
    }

    if (currentStep === SCHEMA_MAPPINGS_STEP) {
      goToStep(isFlow3 ? PREVIEW_RESULTS_STEP : reviewStep);
      return;
    }

    if (currentStep === PREVIEW_RESULTS_STEP) {
      goToStep(FLOW_3_REVIEW_STEP);
    }
  };

  const handleBack = () => {
    if (currentStep === reviewStep) {
      goToStep(isFlow3 ? PREVIEW_RESULTS_STEP : SCHEMA_MAPPINGS_STEP);
      return;
    }
    if (currentStep === PREVIEW_RESULTS_STEP) {
      goToStep(SCHEMA_MAPPINGS_STEP);
      return;
    }
    if (currentStep === SCHEMA_MAPPINGS_STEP) {
      goToStep(ADDITIONAL_SETTINGS_STEP);
      return;
    }
    if (currentStep === ADDITIONAL_SETTINGS_STEP) {
      goToStep(LOGISTICS_STEP);
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

  const showBackButton = currentStep > LOGISTICS_STEP;
  const isLastStep = currentStep === reviewStep;
  const showTestConfiguration = isFlow1 && TEST_CONFIGURATION_STEPS.includes(currentStep);

  const renderStepContent = () => (
    <>
      <div hidden={currentStep !== LOGISTICS_STEP}>
        <LogisticsStep
          control={control}
          dataSources={dataSources}
          onConnectNewDataSource={openCreateDataSourceFlyout}
          validateName={validateName}
          setValue={setValue}
          flowVariant={flowVariant}
          syncRegionFromResource={syncRegionFromResource}
          autoDetectedRegion={autoDetectedRegion}
          onRegionManualChange={handleRegionManualChange}
        />
      </div>
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
      {isFlow3 ? (
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

        {saveError ? (
          <>
            <EuiText color="danger" size="s" data-test-subj="datasetWizardSaveError">
              {saveError}
            </EuiText>
            <EuiSpacer size="m" />
          </>
        ) : null}

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
                      {datasetWizardStrings.nextButton()}
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
