/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useMemo, useRef, useState } from 'react';
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
import { useKibana } from '@kbn/kibana-react-plugin/public';

import type { DataSetWithName, DataSource, DataSourceWithSecrets } from '../../common';
import { validateIndexNameRules } from '../../common';
import { CreateDataSourceFlyout } from '../create_data_source_flyout';
import { buildDatasetSettingsFromFormValues } from '../create_dataset_flyout/create_dataset_flyout_form_state';
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
import { LogisticsStep } from './steps/logistics_step';
import { AdditionalSettingsStep } from './steps/additional_settings_step';
import { PlaceholderStep } from './steps/placeholder_step';

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

  const initialIdNormalized = initialDataSet?.name?.trim().toLowerCase() ?? '';
  const [currentStep, setCurrentStep] = useState(LOGISTICS_STEP);
  const [saveError, setSaveError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [isCreateDataSourceFlyoutOpen, setIsCreateDataSourceFlyoutOpen] = useState(false);
  const additionalSettingsSyncedResourceRef = useRef<string | null>(null);

  const {
    control,
    getValues,
    setValue,
    trigger,
    watch,
    formState: { errors },
  } = useForm<DatasetWizardFormValues>({
    defaultValues,
    mode: 'onChange',
    shouldUnregister: false,
  });

  const watchedDataSource = watch('data_source');
  const watchedName = watch('name');
  const watchedResource = watch('resource');

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

    if (!dataSource || !name || !resource) {
      return false;
    }

    return validateName(name) === true;
  }, [validateName, watchedDataSource, watchedName, watchedResource]);

  const stepDefinitions = useMemo(
    () => [
      {
        step: LOGISTICS_STEP,
        title: datasetWizardStrings.stepLogistics(),
        status: (currentStep === LOGISTICS_STEP ? 'current' : 'complete') as EuiStepStatus,
        onClick: () => setCurrentStep(LOGISTICS_STEP),
      },
      {
        step: ADDITIONAL_SETTINGS_STEP,
        title: datasetWizardStrings.stepAdditionalSettings(),
        disabled: !logisticsStepComplete,
        status: (currentStep === ADDITIONAL_SETTINGS_STEP
          ? 'current'
          : currentStep > ADDITIONAL_SETTINGS_STEP
            ? 'complete'
            : 'incomplete') as EuiStepStatus,
        onClick: () => {
          if (logisticsStepComplete) {
            setCurrentStep(ADDITIONAL_SETTINGS_STEP);
          }
        },
      },
      {
        step: SCHEMA_MAPPINGS_STEP,
        title: datasetWizardStrings.stepSchemaMappings(),
        disabled: !logisticsStepComplete,
        status: (currentStep === SCHEMA_MAPPINGS_STEP
          ? 'current'
          : currentStep > SCHEMA_MAPPINGS_STEP
            ? 'complete'
            : 'incomplete') as EuiStepStatus,
        onClick: () => {
          if (logisticsStepComplete) {
            setCurrentStep(SCHEMA_MAPPINGS_STEP);
          }
        },
      },
      {
        step: REVIEW_STEP,
        title: datasetWizardStrings.stepReview(),
        disabled: !logisticsStepComplete,
        status: (currentStep === REVIEW_STEP ? 'current' : 'incomplete') as EuiStepStatus,
        onClick: () => {
          if (logisticsStepComplete) {
            setCurrentStep(REVIEW_STEP);
          }
        },
      },
    ],
    [currentStep, logisticsStepComplete]
  );

  const handleNext = async () => {
    if (currentStep === LOGISTICS_STEP) {
      const isValid = await trigger(['data_source', 'name', 'resource']);
      if (!isValid) {
        return;
      }
      setCurrentStep(ADDITIONAL_SETTINGS_STEP);
      return;
    }

    if (currentStep === ADDITIONAL_SETTINGS_STEP) {
      setCurrentStep(SCHEMA_MAPPINGS_STEP);
      return;
    }

    if (currentStep === SCHEMA_MAPPINGS_STEP) {
      setCurrentStep(REVIEW_STEP);
    }
  };

  const handleBack = () => {
    if (currentStep === REVIEW_STEP) {
      setCurrentStep(SCHEMA_MAPPINGS_STEP);
      return;
    }
    if (currentStep === SCHEMA_MAPPINGS_STEP) {
      setCurrentStep(ADDITIONAL_SETTINGS_STEP);
      return;
    }
    if (currentStep === ADDITIONAL_SETTINGS_STEP) {
      setCurrentStep(LOGISTICS_STEP);
    }
  };

  const handleSubmit = async () => {
    setSaveError(undefined);
    setIsSaving(true);
    try {
      const values = getValues();
      const desc = values.description?.trim();
      const settings = buildDatasetSettingsFromFormValues(values.settings);
      const payload: DataSetWithName = {
        name: values.name.trim(),
        data_source: values.data_source.trim(),
        resource: values.resource.trim(),
        ...(desc ? { description: desc } : {}),
        ...(settings ? { settings } : {}),
      };
      const message = await onSave(payload, initialDataSet?.name);
      if (message) {
        setSaveError(message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const showBackButton = currentStep > LOGISTICS_STEP;
  const isLastStep = currentStep === REVIEW_STEP;

  const renderStepContent = () => {
    switch (currentStep) {
      case LOGISTICS_STEP:
        return (
          <LogisticsStep
            control={control}
            errors={errors}
            dataSources={dataSources}
            onConnectNewDataSource={openCreateDataSourceFlyout}
            validateName={validateName}
          />
        );
      case ADDITIONAL_SETTINGS_STEP:
        return (
          <AdditionalSettingsStep
            control={control}
            getValues={getValues}
            setValue={setValue}
            resource={watchedResource ?? ''}
            syncedResourceRef={additionalSettingsSyncedResourceRef}
            isEditMode={isEditMode}
          />
        );
      case SCHEMA_MAPPINGS_STEP:
        return (
          <PlaceholderStep stepTitle={datasetWizardStrings.stepSchemaMappings()} />
        );
      case REVIEW_STEP:
        return <PlaceholderStep stepTitle={datasetWizardStrings.stepReview()} />;
      default:
        return null;
    }
  };

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

      <EuiSpacer size="xl" />
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty data-test-subj="datasetWizardCancel" onClick={onCancel}>
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
