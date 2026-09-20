/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageSection,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { Forms } from '@kbn/es-ui-shared-plugin/public';
import { useHistory } from 'react-router-dom';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { FormProvider, useForm } from 'react-hook-form';

import type { DataSetWithName, DataSource } from '../../common';
import { DATASETS_PATH } from '../app_paths';
import { getFlyoutSaveErrorMessage } from '../get_flyout_save_error_message';
import type { DataFederationKibanaServices } from '../types';
import {
  buildDatasetSettingsFromFormValues,
  type CreateDatasetFormValues,
} from './create_dataset_form_state';
import { createDatasetWizardStrings } from './create_dataset_wizard_i18n';
import { dataSetToFormValues, emptyDatasetFormValues } from './dataset_form_initial_values';
import { StepAdditional } from './step_additional';
import { StepDataset } from './step_dataset';
import { StepReview } from './step_review';
import type { DatasetWizardContent, DatasetWizardSection } from './types';

const { FormWizard, FormWizardStep } = Forms;

const wizardContentFromFormValues = (values: CreateDatasetFormValues): DatasetWizardContent => ({
  dataset: {
    name: values.name,
    description: values.description,
    data_source: values.data_source,
    resource: values.resource,
    format: values.settings.format,
    partition_detection: values.settings.partition_detection,
  },
  settings: values.settings,
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

    setIsSaving(true);
    try {
      const desc = values.description?.trim();
      const settings = buildDatasetSettingsFromFormValues(values.settings);
      const payload: DataSetWithName = {
        name: values.name.trim(),
        data_source: values.data_source.trim(),
        resource: values.resource.trim(),
        ...(desc ? { description: desc } : {}),
        ...(settings ? { settings } : {}),
      };
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

  const apiError = useMemo(
    () =>
      saveError ? (
        <EuiText color="danger" size="s" data-test-subj="createDatasetWizardSaveError">
          {saveError}
        </EuiText>
      ) : null,
    [saveError]
  );

  return (
    <EuiPageSection restrictWidth style={{ width: '100%' }} paddingSize="none">
      {/* Keep the wizard body width-restricted while the header above stays full-width */}
      <EuiSpacer size="m" />

      <div data-test-subj="createDatasetWizard">
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2>
                {initialDataSet
                  ? createDatasetWizardStrings.editPageTitle(initialDataSet.name)
                  : createDatasetWizardStrings.pageTitle}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="l" />

        <FormProvider {...methods}>
          <FormWizard<DatasetWizardContent, DatasetWizardSection>
            defaultValue={wizardContentFromFormValues(formDefaultValues)}
            isEditing={isEditMode}
            onSave={onSave}
            isSaving={isSaving}
            apiError={apiError}
            texts={{
              save: isEditMode
                ? createDatasetWizardStrings.saveButton
                : createDatasetWizardStrings.addButton,
            }}
          >
            <FormWizardStep
              id="dataset"
              label={createDatasetWizardStrings.datasetStepLabel}
              isRequired
            >
              <div data-test-subj="createDatasetWizardContent">
                <StepDataset
                  dataSources={dataSources}
                  existingDataSetNames={existingDataSetNames}
                  loadDataSources={loadDataSources}
                  isEditMode={isEditMode}
                  datasetNameToEdit={datasetNameToEdit}
                />
              </div>
            </FormWizardStep>
            <FormWizardStep id="settings" label={createDatasetWizardStrings.additionalStepLabel}>
              <div data-test-subj="createDatasetWizardContent">
                <StepAdditional />
              </div>
            </FormWizardStep>
            <FormWizardStep id="review" label={createDatasetWizardStrings.reviewStepLabel}>
              <div data-test-subj="createDatasetWizardContent">
                <StepReview />
              </div>
            </FormWizardStep>
          </FormWizard>
        </FormProvider>
      </div>
    </EuiPageSection>
  );
}
