/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiPageSection, EuiSpacer, EuiText } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import { Forms } from '@kbn/es-ui-shared-plugin/public';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { FormProvider, useForm } from 'react-hook-form';

import type { DataSetWithName, DataSource } from '../../common';
import { DATASETS_PATH } from '../app_paths';
import { getFlyoutSaveErrorMessage } from '../get_flyout_save_error_message';
import type { DataFederationKibanaServices } from '../types';
import { buildDatasetPayload } from './build_dataset_payload';
import {
  emptyCreateDatasetSettingsFormValues,
  type CreateDatasetFormValues,
} from './create_dataset_form_state';
import { createDatasetWizardStrings } from './create_dataset_wizard_i18n';
import { dataSetToFormValues, emptyDatasetFormValues } from './dataset_form_initial_values';
import { StepAdditional } from './step_additional';
import { StepDataset } from './step_dataset';
import { StepMapping } from './step_mapping';
import { StepReview } from './step_review';
import type { DatasetWizardContent, DatasetWizardSection } from './types';

const { FormWizard, FormWizardStep } = Forms;

const TIMESTAMP_LOGICAL_FIELD_NAME = '@timestamp';
const TIMESTAMP_FIELD_ID = '__timestamp__';
const getUnmanagedDatasetSettings = (
  settings: DataSetWithName['settings'] | undefined
): Partial<NonNullable<DataSetWithName['settings']>> => {
  if (!settings) return {};

  // Preserve any settings keys we don't manage in the UI. This ensures that
  // editing a dataset doesn't drop server-supported settings that aren't
  // currently exposed in the wizard.
  const managedKeys = new Set(Object.keys(emptyCreateDatasetSettingsFormValues()));
  const unmanaged: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(settings as Record<string, unknown>)) {
    if (!managedKeys.has(key) && value !== undefined) {
      unmanaged[key] = value;
    }
  }
  return unmanaged as Partial<NonNullable<DataSetWithName['settings']>>;
};

const wizardContentFromFormValues = (values: CreateDatasetFormValues): DatasetWizardContent => ({
  dataset: {
    name: values.name,
    description: values.description,
    data_source: values.data_source,
    resource: values.resource,
    format: values.settings.format,
  },
  settings: values.settings,
  mapping: values.mappings,
});

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
      setSaveError(
        i18n.translate('xpack.dataFederation.createDatasetWizard.timestampFieldPathRequiredSave', {
          defaultMessage: 'When timeseries data is enabled, Field name is required.',
        })
      );
      return;
    }

    setIsSaving(true);
    try {
      const formPayload = buildDatasetPayload(values);
      const unmanagedSettings = getUnmanagedDatasetSettings(initialDataSet?.settings);
      const mergedSettings = { ...(formPayload.settings ?? {}), ...unmanagedSettings };
      const payload: DataSetWithName = {
        ...formPayload,
        ...(Object.keys(mergedSettings).length > 0 ? { settings: mergedSettings } : {}),
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
              <FormWizard<DatasetWizardContent, DatasetWizardSection>
                defaultValue={wizardContentFromFormValues(formDefaultValues)}
                isEditing={isEditMode}
                onSave={onSave}
                isSaving={isSaving}
                apiError={apiError}
                texts={{
                  save: isEditMode
                    ? createDatasetWizardStrings.saveButton
                    : createDatasetWizardStrings.saveDatasetButton,
                }}
              >
                <FormWizardStep
                  id="dataset"
                  label={createDatasetWizardStrings.datasetStepLabel}
                  isRequired
                >
                  <div
                    data-test-subj="createDatasetWizardContent"
                    style={{ width: '100%', maxWidth: MAX_WIDTH_NARROW_PX }}
                  >
                    <StepDataset
                      dataSources={dataSources}
                      existingDataSetNames={existingDataSetNames}
                      loadDataSources={loadDataSources}
                      isEditMode={isEditMode}
                      datasetNameToEdit={datasetNameToEdit}
                    />
                  </div>
                </FormWizardStep>
                <FormWizardStep
                  id="settings"
                  label={createDatasetWizardStrings.additionalStepLabel}
                >
                  <div
                    data-test-subj="createDatasetWizardContent"
                    style={{ width: '100%', maxWidth: MAX_WIDTH_NARROW_PX }}
                  >
                    <StepAdditional />
                  </div>
                </FormWizardStep>
                <FormWizardStep id="mapping" label={createDatasetWizardStrings.mappingStepLabel}>
                  <div data-test-subj="createDatasetWizardContent">
                    <StepMapping />
                  </div>
                </FormWizardStep>
                <FormWizardStep id="review" label={createDatasetWizardStrings.reviewStepLabel}>
                  <div data-test-subj="createDatasetWizardContent">
                    <StepReview dataSources={dataSources} />
                  </div>
                </FormWizardStep>
              </FormWizard>
            </div>
          </FormProvider>
        </div>
      </EuiPageSection>
    </>
  );
}
