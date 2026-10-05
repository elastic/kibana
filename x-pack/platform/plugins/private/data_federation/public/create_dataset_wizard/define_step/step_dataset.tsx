/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { useFormContext, useFormState, useWatch, type FieldPath } from 'react-hook-form';

import type { DataSource } from '../../../common';
import { CreateDatasetDetailsFields } from './create_dataset_details_fields';
import type { CreateDatasetFormValues, DatasetFormatFormValue } from '../create_dataset_form_state';
import { CreateDatasetFormatField } from '../options_step/create_dataset_settings';
import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import { SUPPORTED_DATASET_FORMATS, type SupportedDatasetFormat } from './fields/format_select';
import { useWizardStep } from '../wizard_step_context';

const DATASET_STEP_FIELDS: Array<FieldPath<CreateDatasetFormValues>> = [
  'name',
  'data_source',
  'resource',
  'settings.format',
];

const isSupportedDatasetFormat = (value: string): value is SupportedDatasetFormat =>
  (SUPPORTED_DATASET_FORMATS as readonly string[]).includes(value);

const inferFormatFromResource = (resource: string): DatasetFormatFormValue => {
  const value = resource?.trim().toLowerCase();
  if (!value) return '';

  // Match common data file extensions anywhere in the path (including globs).
  // We pick the last extension occurrence to handle paths like `.../*.csv.gz`.
  const supportedExtensionsPattern = SUPPORTED_DATASET_FORMATS.join('|');
  const extRegex = new RegExp(`\\.(${supportedExtensionsPattern})(?:$|[?#]|[^a-z0-9])`, 'g');
  let match: RegExpExecArray | null;
  let lastExt: string | undefined;
  while ((match = extRegex.exec(value)) !== null) {
    lastExt = match[1];
  }

  if (!lastExt || !isSupportedDatasetFormat(lastExt)) return '';

  return lastExt;
};

export function StepDataset({
  dataSources,
  existingDataSetNames,
  loadDataSources,
  isEditMode = false,
  datasetNameToEdit = '',
}: {
  dataSources: DataSource[];
  existingDataSetNames: readonly string[];
  loadDataSources: () => Promise<void>;
  isEditMode?: boolean;
  datasetNameToEdit?: string;
}) {
  const { control, getFieldState, setValue, trigger } = useFormContext<CreateDatasetFormValues>();
  const formState = useFormState({ control, name: DATASET_STEP_FIELDS });
  const hasFieldErrors = DATASET_STEP_FIELDS.some(
    (field) => getFieldState(field, formState).invalid
  );
  const updateContent = useWizardStep();
  const name = useWatch({ control, name: 'name' });
  const dataSource = useWatch({ control, name: 'data_source' });
  const resource = useWatch({ control, name: 'resource' });
  const format = useWatch({ control, name: 'settings.format' });
  const formatWasAutoDetected = useWatch({ control, name: 'ui.formatWasAutoDetected' });
  const [hasAttemptedValidation, setHasAttemptedValidation] = useState(false);

  useEffect(() => {
    const inferredFormat = inferFormatFromResource(resource);
    if (!inferredFormat || inferredFormat === format) return;

    // Only auto-select when the format is unset or was itself auto-selected, so a manual choice
    // (which clears `ui.formatWasAutoDetected`) is never overridden. The flag lives in form state
    // so it survives this step unmounting when the user moves to another step and back.
    if (!format || formatWasAutoDetected) {
      setValue('settings.format', inferredFormat, { shouldValidate: true });
      setValue('ui.formatWasAutoDetected', true);
    }
  }, [format, formatWasAutoDetected, resource, setValue]);

  useEffect(() => {
    // Don't mark the step invalid (disabling Next) until the user tries to proceed.
    updateContent({
      isValid: !hasAttemptedValidation || !hasFieldErrors,
      validate: async () => {
        setHasAttemptedValidation(true);
        return trigger(DATASET_STEP_FIELDS);
      },
    });
  }, [hasAttemptedValidation, hasFieldErrors, trigger, updateContent]);

  useEffect(() => {
    // The form uses react-hook-form's default `onSubmit` mode, and the wizard never submits it,
    // so errors shown after a Next attempt would otherwise not clear until Next is clicked again.
    if (!hasAttemptedValidation) return;
    trigger(DATASET_STEP_FIELDS);
  }, [name, dataSource, resource, format, hasAttemptedValidation, trigger]);

  return (
    <div data-test-subj="createDatasetWizardDatasetStep">
      <EuiTitle size="m">
        <h2>{createDatasetWizardStrings.datasetStepLabel}</h2>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size="s" color="subdued">
        {createDatasetWizardStrings.datasetStepSubheader}
      </EuiText>
      <EuiSpacer size="m" />
      <CreateDatasetDetailsFields
        control={control}
        dataSources={dataSources}
        existingDataSetNames={existingDataSetNames}
        isEditMode={isEditMode}
        datasetNameToEdit={datasetNameToEdit}
        loadDataSources={loadDataSources}
      />
      <EuiSpacer size="m" />
      <CreateDatasetFormatField control={control} />
    </div>
  );
}
