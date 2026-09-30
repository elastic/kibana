/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageSection,
  EuiSpacer,
  EuiStepsHorizontal,
} from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { useHistory } from 'react-router-dom';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { FormProvider, useForm } from 'react-hook-form';

import type { DataSetWithName, DataSource } from '../../common';
import { DATASETS_PATH } from '../app_paths';
import { getFlyoutSaveErrorMessage } from '../get_flyout_save_error_message';
import type { DataFederationKibanaServices } from '../types';
import { buildDatasetPayload } from './build_dataset_payload';
import { TIMESTAMP_FIELD_ID, TIMESTAMP_LOGICAL_FIELD_NAME } from './constants';
import { type CreateDatasetFormValues } from './create_dataset_form_state';
import { createDatasetWizardStrings } from './create_dataset_wizard_i18n';
import { dataSetToFormValues, emptyDatasetFormValues } from './dataset_form_initial_values';
import { StepAdditional } from './options_step/step_additional';
import { StepDataset } from './define_step/step_dataset';
import { StepMapping } from './mapping_step/step_mapping';
import { StepReview } from './review_step/step_review';
import type { DatasetWizardStepContent, DatasetWizardStepId } from './types';
import { WizardStepProvider } from './wizard_step_context';

const STEPS: Array<{ id: DatasetWizardStepId; label: string }> = [
  { id: 'dataset', label: createDatasetWizardStrings.datasetStepLabel },
  { id: 'settings', label: createDatasetWizardStrings.additionalStepLabel },
  { id: 'mapping', label: createDatasetWizardStrings.mappingStepLabel },
  { id: 'review', label: createDatasetWizardStrings.reviewStepLabel },
];
const LAST_STEP_INDEX = STEPS.length - 1;
const INITIAL_STEP_CONTENT: DatasetWizardStepContent = { validate: async () => true };
const NARROW_STEPS: DatasetWizardStepId[] = ['dataset', 'settings'];

const MAX_WIDTH_NARROW_PX = 600;
const MAX_WIDTH_WIDE_PX = 1024;

export function CreateDatasetWizardPage({
  dataSources,
  existingDataSetNames,
  loadDataSets,
  loadDataSources,
  initialDataSet,
}: {
  dataSources: DataSource[];
  existingDataSetNames: readonly string[];
  loadDataSets: () => Promise<void>;
  loadDataSources: () => Promise<void>;
  initialDataSet?: DataSetWithName;
}) {
  const history = useHistory();
  const {
    services: { datasetsClient },
  } = useKibana<DataFederationKibanaServices>();
  const isEditMode = initialDataSet !== undefined;
  const datasetNameToEdit = initialDataSet?.name;
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const formDefaultValues = useMemo(
    (): CreateDatasetFormValues =>
      initialDataSet ? dataSetToFormValues(initialDataSet) : emptyDatasetFormValues(),
    [initialDataSet]
  );
  const methods = useForm<CreateDatasetFormValues>({
    defaultValues: formDefaultValues,
  });

  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [stepContent, setStepContent] = useState(INITIAL_STEP_CONTENT);

  const goToStep = async (index: number) => {
    if (index === activeStepIndex) return;
    if (index > activeStepIndex && !(await stepContent.validate())) return;
    setStepContent(INITIAL_STEP_CONTENT);
    setActiveStepIndex(index);
  };

  const goToDatasets = useCallback(() => {
    history.push(DATASETS_PATH);
  }, [history]);

  const onSave = useCallback(async () => {
    const values = methods.getValues();
    setSaveError(null);

    const formatValid = await methods.trigger('settings.format');
    if (!formatValid) {
      setSaveError(createDatasetWizardStrings.settingsFormatRequired);
      return;
    }

    const timestampField = values.mappings.fields.find(
      (f) => f.id === TIMESTAMP_FIELD_ID || f.name.trim() === TIMESTAMP_LOGICAL_FIELD_NAME
    );
    if (timestampField && timestampField.path.trim() === '') {
      setSaveError(createDatasetWizardStrings.timestampFieldPathRequiredSave);
      return;
    }

    setIsSaving(true);
    try {
      const payload = buildDatasetPayload(values);
      await datasetsClient.add(payload);

      const previousId = initialDataSet?.name.trim();
      if (previousId && previousId !== payload.name) {
        await datasetsClient.delete(previousId);
      }

      await loadDataSets();
      goToDatasets();
    } catch (error) {
      setSaveError(getFlyoutSaveErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }, [datasetsClient, goToDatasets, initialDataSet, loadDataSets, methods]);

  const activeStepId = STEPS[activeStepIndex].id;
  const isLastStep = activeStepIndex === LAST_STEP_INDEX;

  const isStepDisabled = (index: number) =>
    index > activeStepIndex &&
    (stepContent.isValid === false || (!isEditMode && index > activeStepIndex + 1));

  const apiError = useMemo(
    () =>
      saveError ? (
        <>
          <KbnDangerCallout
            title={createDatasetWizardStrings.saveErrorTitle}
            text={saveError}
            size="s"
            announceOnMount
            data-test-subj="createDatasetWizardSaveError"
          />
          <EuiSpacer size="m" />
        </>
      ) : null,
    [saveError]
  );

  return (
    <>
      <AppHeader
        title={
          initialDataSet
            ? createDatasetWizardStrings.editPageTitle(initialDataSet.name)
            : createDatasetWizardStrings.pageTitle
        }
        back={{
          href: history.createHref({ pathname: DATASETS_PATH }),
          label: createDatasetWizardStrings.backToListLabel,
        }}
        spacing="bleed"
      />

      <EuiPageSection restrictWidth={false} style={{ width: '100%' }} paddingSize="none">
        <EuiSpacer size="m" />

        <div data-test-subj="createDatasetWizard">
          <FormProvider {...methods}>
            <div
              style={{
                width: '100%',
                // Keep navigation controls (Next/Back/Save) aligned consistently across steps.
                // Individual steps can still constrain their content width as needed.
                maxWidth: MAX_WIDTH_WIDE_PX,
                marginInline: 'auto',
              }}
            >
              <EuiStepsHorizontal
                steps={STEPS.map(({ id, label }, index) => ({
                  title: label,
                  status:
                    index === activeStepIndex
                      ? 'current'
                      : index < activeStepIndex
                      ? 'complete'
                      : 'incomplete',
                  disabled: isStepDisabled(index),
                  onClick: () => goToStep(index),
                  'data-test-subj': `createDatasetWizardStep-${id}`,
                }))}
              />
              <EuiSpacer size="l" />
              {apiError}
              <WizardStepProvider value={setStepContent}>
                <div
                  data-test-subj="createDatasetWizardContent"
                  style={
                    NARROW_STEPS.includes(activeStepId)
                      ? { width: '100%', maxWidth: MAX_WIDTH_NARROW_PX }
                      : undefined
                  }
                >
                  {activeStepId === 'dataset' && (
                    <StepDataset
                      dataSources={dataSources}
                      existingDataSetNames={existingDataSetNames}
                      loadDataSources={loadDataSources}
                      isEditMode={isEditMode}
                      datasetNameToEdit={datasetNameToEdit}
                    />
                  )}
                  {activeStepId === 'settings' && <StepAdditional />}
                  {activeStepId === 'mapping' && <StepMapping />}
                  {activeStepId === 'review' && <StepReview dataSources={dataSources} />}
                </div>
              </WizardStepProvider>
              <EuiSpacer size="l" />
              <EuiFlexGroup gutterSize="m" responsive={false}>
                {activeStepIndex > 0 ? (
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      iconType="chevronSingleLeft"
                      onClick={() => goToStep(activeStepIndex - 1)}
                      data-test-subj="backButton"
                    >
                      {createDatasetWizardStrings.backButton}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                ) : null}
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    iconType={isLastStep ? 'check' : 'chevronSingleRight'}
                    iconSide={isLastStep ? 'left' : 'right'}
                    onClick={() => (isLastStep ? onSave() : goToStep(activeStepIndex + 1))}
                    disabled={stepContent.isValid === false}
                    isLoading={isSaving}
                    data-test-subj="nextButton"
                  >
                    {isLastStep
                      ? isSaving
                        ? createDatasetWizardStrings.savingButton
                        : isEditMode
                        ? createDatasetWizardStrings.saveButton
                        : createDatasetWizardStrings.saveDatasetButton
                      : createDatasetWizardStrings.nextButton}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>
          </FormProvider>
        </div>
      </EuiPageSection>
    </>
  );
}
