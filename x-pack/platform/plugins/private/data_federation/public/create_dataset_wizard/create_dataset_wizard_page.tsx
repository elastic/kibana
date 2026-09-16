/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
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
} from '../create_dataset_flyout/create_dataset_flyout_form_state';
import { createDatasetFlyoutStrings } from '../create_dataset_flyout/create_dataset_flyout_i18n';
import { emptyDatasetFlyoutFormValues } from '../create_dataset_flyout/dataset_flyout_initial_values';
import { createDatasetWizardStrings } from './create_dataset_wizard_i18n';
import { StepAdvanced } from './step_advanced';
import { StepDataset } from './step_dataset';
import { StepReview } from './step_review';
import type { DatasetWizardContent, DatasetWizardSection } from './types';

const { FormWizard, FormWizardStep } = Forms;

const emptyWizardValue: DatasetWizardContent = {
  dataset: { name: '', description: '', data_source: '', resource: '' },
  settings: emptyDatasetFlyoutFormValues().settings,
};

export function CreateDatasetWizardPage({
  dataSources,
  existingDataSetNames,
  loadDataSets,
}: {
  dataSources: DataSource[];
  existingDataSetNames: readonly string[];
  loadDataSets: () => Promise<void>;
}) {
  const history = useHistory();
  const {
    services: { datasetsClient },
  } = useKibana<DataFederationKibanaServices>();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const methods = useForm<CreateDatasetFormValues>({
    defaultValues: emptyDatasetFlyoutFormValues(),
  });

  const goToDatasets = useCallback(() => {
    history.push(DATASETS_PATH);
  }, [history]);

  const onSave = useCallback(async () => {
    const values = methods.getValues();
    setSaveError(null);

    const formatValid = await methods.trigger('settings.format');
    if (!formatValid) {
      setSaveError(createDatasetFlyoutStrings.settingsFormatRequired());
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
      await loadDataSets();
      goToDatasets();
    } catch (error) {
      setSaveError(getFlyoutSaveErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }, [datasetsClient, goToDatasets, loadDataSets, methods]);

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
    <div data-test-subj="createDatasetWizard">
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="m">
            <h2>{createDatasetWizardStrings.pageTitle()}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            onClick={goToDatasets}
            disabled={isSaving}
            data-test-subj="createDatasetWizardCancel"
          >
            {createDatasetFlyoutStrings.cancelButton()}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />

      <FormProvider {...methods}>
        <FormWizard<DatasetWizardContent, DatasetWizardSection>
          defaultValue={emptyWizardValue}
          onSave={onSave}
          isSaving={isSaving}
          apiError={apiError}
          texts={{ save: createDatasetFlyoutStrings.addButton() }}
        >
          <FormWizardStep
            id="dataset"
            label={createDatasetWizardStrings.datasetStepLabel()}
            isRequired
          >
            <StepDataset dataSources={dataSources} existingDataSetNames={existingDataSetNames} />
          </FormWizardStep>
          <FormWizardStep id="settings" label={createDatasetWizardStrings.advancedStepLabel()}>
            <StepAdvanced />
          </FormWizardStep>
          <FormWizardStep id="review" label={createDatasetWizardStrings.reviewStepLabel()}>
            <StepReview />
          </FormWizardStep>
        </FormWizard>
      </FormProvider>
    </div>
  );
}
