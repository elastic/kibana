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
} from '@elastic/eui';
import { useForm } from 'react-hook-form';
import { useHistory, useLocation } from 'react-router-dom';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import type { DataSetWithName, DataSource, DataSourceWithSecrets } from '../../common';
import { validateIndexNameRules } from '../../common';
import { CreateDataSourceFlyout } from '../create_data_source_flyout';
import { buildDatasetPayloadFromWizardValues } from './review_step_utils';
import { getFlyoutSaveErrorMessage } from '../get_flyout_save_error_message';
import type { DataFederationKibanaServices } from '../types';
import {
  ADDITIONAL_SETTINGS_STEP,
  DATASET_WIZARD_FORM_MAX_WIDTH,
  LOGISTICS_STEP,
  REVIEW_STEP,
  SCHEMA_MAPPINGS_STEP,
} from './dataset_wizard_constants';
import { datasetWizardStrings } from './dataset_wizard_i18n';
import type { DatasetWizardFormValues } from './dataset_wizard_form_state';
import {
  buildWizardStepSearch,
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
import { LogisticsStep } from './steps/logistics_step';
import { AdditionalSettingsStep } from './steps/additional_settings_step';
import { SchemaMappingsStep } from './steps/schema_mappings_step';
import { ReviewStep } from './steps/review_step';
import { TestConfigurationPreview } from './test_configuration_preview';

const TEST_CONFIGURATION_LOADING_MS = 600;
const TEST_CONFIGURATION_STEPS: DatasetWizardStep[] = [SCHEMA_MAPPINGS_STEP, REVIEW_STEP];

export interface DatasetWizardProps {
  isEditMode: boolean;
  initialDataSet?: DataSetWithName;
  existingDataSetNames: readonly string[];
  dataSources: DataSource[];
  defaultValues: DatasetWizardFormValues;
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
  reloadDataSources,
  onCancel,
  onSave,
}) => {
  const {
    services: { dataSourcesClient },
  } = useKibana<DataFederationKibanaServices>();
  const history = useHistory();
  const location = useLocation();
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
  const testConfigLoadingTimeoutRef = useRef<number | undefined>(undefined);
  const additionalSettingsSyncedResourceRef = useRef<string | null>(null);

  const {
    control,
    getValues,
    setValue,
    trigger,
    watch,
  } = useForm<DatasetWizardFormValues>({
    defaultValues,
    mode: 'onChange',
    shouldUnregister: false,
  });

  const watchedDataSource = watch('data_source');
  const watchedName = watch('name');
  const watchedResource = watch('resource');
  const watchedRegion = watch('region');

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

    if (!dataSource || !name || !resource || !region) {
      return false;
    }

    if (validateName(name) !== true) {
      return false;
    }

    return validateResourceForDataSource(resource, dataSource, dataSources) === true;
  }, [dataSources, validateName, watchedDataSource, watchedName, watchedRegion, watchedResource]);

  useEffect(() => {
    const stepFromUrl = parseWizardStepFromSearch(location.search) ?? LOGISTICS_STEP;

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
      });

      if (isCancelled) {
        return;
      }

      const nextStep = firstInvalidStep ?? stepFromUrl;
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
  }, [getValues, history, location.pathname, location.search, trigger]);

  useEffect(() => {
    setIsTestConfigPanelOpen(false);
    setIsTestConfigLoading(false);
    if (testConfigLoadingTimeoutRef.current !== undefined) {
      window.clearTimeout(testConfigLoadingTimeoutRef.current);
      testConfigLoadingTimeoutRef.current = undefined;
    }
  }, [currentStep]);

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

  const attemptGoToStep = useCallback(
    async (targetStep: DatasetWizardStep) => {
      setSaveError(undefined);

      if (targetStep <= currentStep) {
        goToStep(targetStep);
        return;
      }

      const values = getValues();
      const firstInvalidStep = await findFirstInvalidWizardStep({
        targetStep,
        values,
        trigger,
      });

      if (firstInvalidStep !== undefined) {
        goToStep(firstInvalidStep);
        return;
      }

      goToStep(targetStep);
    },
    [currentStep, getValues, goToStep, trigger]
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
      {
        step: REVIEW_STEP,
        title: datasetWizardStrings.stepReview(),
        disabled: isStepDisabled(REVIEW_STEP),
        status: (currentStep === REVIEW_STEP ? 'current' : 'incomplete') as EuiStepStatus,
        onClick: () => void attemptGoToStep(REVIEW_STEP),
      },
    ],
    [attemptGoToStep, currentStep, isStepDisabled, logisticsStepComplete]
  );

  const handleNext = async () => {
    setSaveError(undefined);

    const values = getValues();
    const fields = getWizardStepFields(currentStep, values);
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
      goToStep(REVIEW_STEP);
    }
  };

  const handleBack = () => {
    if (currentStep === REVIEW_STEP) {
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

    const values = getValues();
    const firstInvalidStep = await findFirstInvalidWizardStep({
      targetStep: REVIEW_STEP,
      values,
      trigger,
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
  const isLastStep = currentStep === REVIEW_STEP;
  const showTestConfiguration = TEST_CONFIGURATION_STEPS.includes(currentStep);

  const renderStepContent = () => (
    <>
      <div hidden={currentStep !== LOGISTICS_STEP}>
        <LogisticsStep
          control={control}
          dataSources={dataSources}
          onConnectNewDataSource={openCreateDataSourceFlyout}
          validateName={validateName}
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
        />
      </div>
      <div hidden={currentStep !== SCHEMA_MAPPINGS_STEP}>
        <SchemaMappingsStep
          control={control}
          dataSources={dataSources}
          dataSource={watchedDataSource ?? ''}
          dataSourceRegion={watchedRegion ?? ''}
        />
      </div>
      <div hidden={currentStep !== REVIEW_STEP}>
        <ReviewStep values={getValues()} dataSources={dataSources} />
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

      <EuiSpacer size="xl" />
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty data-test-subj="datasetWizardCancel" onClick={handleCancel}>
            {datasetWizardStrings.cancelButton()}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" responsive={false}>
            {showBackButton ? (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty data-test-subj="datasetWizardBack" onClick={handleBack}>
                  {datasetWizardStrings.backButton()}
                </EuiButtonEmpty>
              </EuiFlexItem>
            ) : null}
            {showTestConfiguration ? (
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
                  data-test-subj="datasetWizardNext"
                  onClick={() => void handleNext()}
                >
                  {datasetWizardStrings.nextButton()}
                </EuiButton>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
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
