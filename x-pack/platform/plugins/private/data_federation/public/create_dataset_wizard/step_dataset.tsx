/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { Forms } from '@kbn/es-ui-shared-plugin/public';
import { useFormContext, useWatch } from 'react-hook-form';

import type { DataSource } from '../../common';
import { CreateDatasetDetailsFields } from './create_dataset_details_fields';
import type { CreateDatasetFormValues, DatasetFormatFormValue } from './create_dataset_form_state';
import { CreateDatasetFormatField } from './create_dataset_settings';
import { createDatasetWizardStrings } from './create_dataset_wizard_i18n';
import { SUPPORTED_DATASET_FORMATS, type SupportedDatasetFormat } from './components/format_select';
import type { DatasetWizardContent } from './types';

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
  const { control, getValues, setValue, trigger } = useFormContext<CreateDatasetFormValues>();
  const { updateContent } = Forms.useContent<DatasetWizardContent, 'dataset'>('dataset');
  const name = useWatch({ control, name: 'name' });
  const dataSource = useWatch({ control, name: 'data_source' });
  const resource = useWatch({ control, name: 'resource' });
  const format = useWatch({ control, name: 'settings.format' });
  const [hasAttemptedValidation, setHasAttemptedValidation] = useState(false);
  const lastAutoSelectedFormatRef = useRef<DatasetFormatFormValue | null>(null);

  useEffect(() => {
    // If the user changes format away from what we last auto-selected, stop auto-updating.
    if (
      format &&
      lastAutoSelectedFormatRef.current &&
      format !== lastAutoSelectedFormatRef.current
    ) {
      lastAutoSelectedFormatRef.current = null;
      setValue('ui.formatWasAutoDetected', false);
    }
  }, [format, setValue]);

  useEffect(() => {
    const inferredFormat = inferFormatFromResource(resource);
    if (!inferredFormat) return;

    // Only auto-select when:
    // - the format is not set yet, OR
    // - the current format was previously auto-selected (so we can keep it in sync with path changes)
    if (!format || format === lastAutoSelectedFormatRef.current) {
      lastAutoSelectedFormatRef.current = inferredFormat;
      setValue('settings.format', inferredFormat, { shouldValidate: true });
      setValue('ui.formatWasAutoDetected', true);
    }
  }, [format, resource, setValue]);

  useEffect(() => {
    // Don't mark the step invalid (disabling Next) until the user tries to proceed.
    const isValid =
      !hasAttemptedValidation ||
      Boolean(name?.trim() && dataSource?.trim() && resource?.trim() && format?.trim());
    updateContent({
      isValid,
      validate: async () => {
        setHasAttemptedValidation(true);
        return trigger(['name', 'data_source', 'resource', 'settings.format']);
      },
      getData: () => {
        const values = getValues();
        return {
          name: values.name,
          description: values.description,
          data_source: values.data_source,
          resource: values.resource,
          format: values.settings.format,
        };
      },
    });
  }, [
    name,
    dataSource,
    resource,
    format,
    getValues,
    hasAttemptedValidation,
    trigger,
    updateContent,
  ]);

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
