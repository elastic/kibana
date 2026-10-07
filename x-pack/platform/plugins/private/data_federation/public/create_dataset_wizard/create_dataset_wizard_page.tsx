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
import { type CreateDatasetFormValues } from './create_dataset_form_state';
import { createDatasetWizardStrings } from './create_dataset_wizard_i18n';
import { dataSetToFormValues, emptyDatasetFormValues } from './dataset_form_initial_values';
import { StepAdditional } from './options_step/step_additional';
import { StepDataset } from './define_step/step_dataset';
import { DiscardFieldChangesModal } from './mapping_step/discard_field_changes_modal';
import { StepMapping } from './mapping_step/step_mapping';
import { StepReview } from './review_step/step_review';
import { getValidStepIds } from './step_validity';
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
const NARROW_STEPS: DatasetWizardStepId[] = ['dataset'];
const OPTIONAL_STEP_IDS: DatasetWizardStepId[] = ['settings'];

const MAX_WIDTH_NARROW_PX = 600;
const MAX_WIDTH_WIDE_PX = 1024;

interface SaveError {
  title: string;
  text: string;
}

const toSaveError = (text: string): SaveError => ({
  title: createDatasetWizardStrings.saveErrorTitle,
  text,
});

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
    services: { datasetsClient, toasts },
  } = useKibana<DataFederationKibanaServices>();
  const isEditMode = initialDataSet !== undefined;
  const datasetNameToEdit = initialDataSet?.name;
  const [saveError, setSaveError] = useState<SaveError | null>(null);
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
  const [pendingNavigation, setPendingNavigation] = useState<{
    index: number;
    isActiveStepValid: boolean;
  } | null>(null);
  // Field rules only run while their step is mounted, so a step can only be skipped over once it
  // has passed validation, and its result is re-recorded whenever it is left in either direction.
  // A saved dataset's steps start out validated when its values pass them; a new dataset's
  // optional steps hold defaults that always pass, while its required steps must be visited.
  const [validatedStepIds, setValidatedStepIds] = useState<ReadonlySet<DatasetWizardStepId>>(
    () => new Set(isEditMode ? getValidStepIds(formDefaultValues) : OPTIONAL_STEP_IDS)
  );

  // Rules can depend on values from other steps (e.g. CSV character defaults on the format), so a
  // validated step must also still pass for the current values to be skipped over.
  const skipsUnvalidatedStep = (index: number) => {
    const validStepIds = getValidStepIds(methods.getValues());
    return STEPS.slice(activeStepIndex + 1, index).some(
      ({ id }) => !validatedStepIds.has(id) || !validStepIds.includes(id)
    );
  };

  const leaveActiveStep = (index: number, isActiveStepValid: boolean) => {
    const activeId = STEPS[activeStepIndex].id;
    setValidatedStepIds((prev) => {
      const next = new Set(prev);
      if (isActiveStepValid) next.add(activeId);
      else next.delete(activeId);
      return next;
    });
    setStepContent(INITIAL_STEP_CONTENT);
    setActiveStepIndex(index);
  };

  const goToStep = async (index: number) => {
    if (index === activeStepIndex) return;
    const isForward = index > activeStepIndex;
    if (isForward && skipsUnvalidatedStep(index)) return;
    const isActiveStepValid = await stepContent.validate();
    if (isForward && !isActiveStepValid) return;
    if (stepContent.hasUnsavedChanges) {
      setPendingNavigation({ index, isActiveStepValid });
      return;
    }
    leaveActiveStep(index, isActiveStepValid);
  };

  const confirmPendingNavigation = () => {
    if (!pendingNavigation) return;
    setPendingNavigation(null);
    leaveActiveStep(pendingNavigation.index, pendingNavigation.isActiveStepValid);
  };

  const goToDatasets = useCallback(() => {
    history.push(DATASETS_PATH);
  }, [history]);

  const onSave = useCallback(async () => {
    const values = methods.getValues();
    setSaveError(null);

    setIsSaving(true);
    const previousName = initialDataSet?.name.trim();
    let savedName: string;
    try {
      const payload = buildDatasetPayload(values);
      await datasetsClient.add(payload);
      savedName = payload.name;
    } catch (error) {
      setSaveError(toSaveError(getFlyoutSaveErrorMessage(error)));
      setIsSaving(false);
      return;
    }

    if (previousName && previousName !== savedName) {
      try {
        await datasetsClient.delete(previousName);
      } catch (error) {
        setSaveError({
          title: createDatasetWizardStrings.deletePreviousErrorTitle,
          text: createDatasetWizardStrings.deletePreviousErrorText(
            savedName,
            previousName,
            getFlyoutSaveErrorMessage(error)
          ),
        });
        setIsSaving(false);
        return;
      }
    }

    try {
      await loadDataSets();
    } catch (error) {
      toasts.addDanger({
        title: createDatasetWizardStrings.refreshAfterSaveErrorTitle(savedName),
        text: getFlyoutSaveErrorMessage(error),
      });
    } finally {
      setIsSaving(false);
      goToDatasets();
    }
  }, [datasetsClient, goToDatasets, initialDataSet, loadDataSets, methods, toasts]);

  const activeStepId = STEPS[activeStepIndex].id;
  const isLastStep = activeStepIndex === LAST_STEP_INDEX;

  const isStepDisabled = (index: number) =>
    index > activeStepIndex && (stepContent.isValid === false || skipsUnvalidatedStep(index));

  const apiError = useMemo(
    () =>
      saveError ? (
        <>
          <KbnDangerCallout
            title={saveError.title}
            text={saveError.text}
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
              {apiError}
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
                    iconType={isLastStep ? undefined : 'chevronSingleRight'}
                    iconSide="right"
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
                        : createDatasetWizardStrings.addDatasetButton
                      : createDatasetWizardStrings.nextButton}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>
          </FormProvider>
        </div>
      </EuiPageSection>
      {pendingNavigation ? (
        <DiscardFieldChangesModal
          onCancel={() => setPendingNavigation(null)}
          onConfirm={confirmPendingNavigation}
        />
      ) : null}
    </>
  );
}
