/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent, MutableRefObject } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiForm, EuiFormRow, EuiSpacer, EuiSuperSelect, EuiText, EuiTitle } from '@elastic/eui';
import type { Control, UseFormGetValues, UseFormSetValue } from 'react-hook-form';
import { useController } from 'react-hook-form';

import { DatasetSettingsAccordions } from '../../create_dataset_flyout/dataset_settings_accordions';
import { DatasetSettingsCommonPanel } from '../../create_dataset_flyout/dataset_settings_common_panel';
import { applyFormatDefaults } from '../../create_dataset_flyout/dataset_settings_defaults';
import { FORMAT_SUPER_SELECT_OPTIONS } from '../../create_dataset_flyout/dataset_settings_options';
import type { DatasetFormatFormValue } from '../../create_dataset_flyout/create_dataset_flyout_form_state';
import { createDatasetFlyoutStrings } from '../../create_dataset_flyout/create_dataset_flyout_i18n';
import { datasetWizardStrings } from '../dataset_wizard_i18n';
import type { DatasetWizardFormValues } from '../dataset_wizard_form_state';
import { inferFormatFromResource } from '../infer_format_from_resource';

const FORMAT_VALUES: DatasetFormatFormValue[] = ['csv', 'tsv', 'parquet', 'ndjson', 'orc'];

const isKnownFormat = (value: string): value is Exclude<DatasetFormatFormValue, ''> =>
  FORMAT_VALUES.includes(value as Exclude<DatasetFormatFormValue, ''>);

type FormatSelectionSource = 'none' | 'auto' | 'manual';

export interface AdditionalSettingsStepProps {
  control: Control<DatasetWizardFormValues>;
  getValues: UseFormGetValues<DatasetWizardFormValues>;
  setValue: UseFormSetValue<DatasetWizardFormValues>;
  resource: string;
  syncedResourceRef: MutableRefObject<string | null>;
  isEditMode: boolean;
}

export const AdditionalSettingsStep: FunctionComponent<AdditionalSettingsStepProps> = ({
  control,
  getValues,
  setValue,
  resource,
  syncedResourceRef,
  isEditMode,
}) => {
  const [autoDetectedFormat, setAutoDetectedFormat] = useState<DatasetFormatFormValue | ''>('');
  const [formatSelectionSource, setFormatSelectionSource] = useState<FormatSelectionSource>('none');

  const { field: formatField } = useController({
    name: 'settings.format',
    control,
  });

  const format = formatField.value as DatasetFormatFormValue;
  const hasFormatSelected = isKnownFormat(format);

  const applyFormatDefaultsToForm = useCallback(
    (nextFormat: Exclude<DatasetFormatFormValue, ''>) => {
      const currentSettings = getValues('settings');
      const withDefaults = applyFormatDefaults(
        { ...currentSettings, format: nextFormat },
        nextFormat
      );
      setValue('settings', withDefaults, { shouldDirty: true, shouldValidate: true });
    },
    [getValues, setValue]
  );

  const handleFormatSelection = useCallback(
    (nextFormat: Exclude<DatasetFormatFormValue, ''>, source: FormatSelectionSource) => {
      applyFormatDefaultsToForm(nextFormat);
      setFormatSelectionSource(source);
      if (source === 'auto') {
        setAutoDetectedFormat(nextFormat);
      } else if (nextFormat !== autoDetectedFormat) {
        setAutoDetectedFormat('');
      }
    },
    [applyFormatDefaultsToForm, autoDetectedFormat]
  );

  useEffect(() => {
    const inferredFormat = inferFormatFromResource(resource);
    const resourceChanged = syncedResourceRef.current !== resource;

    if (!resourceChanged) {
      if (!isKnownFormat(formatField.value)) {
        return;
      }

      if (formatSelectionSource !== 'none') {
        return;
      }

      if (inferredFormat && formatField.value === inferredFormat) {
        setAutoDetectedFormat(inferredFormat);
        setFormatSelectionSource('auto');
      } else {
        setFormatSelectionSource('manual');
      }
      return;
    }

    syncedResourceRef.current = resource;

    if (inferredFormat) {
      handleFormatSelection(inferredFormat, 'auto');
      return;
    }

    if (isEditMode && isKnownFormat(formatField.value)) {
      setFormatSelectionSource('manual');
      return;
    }

    formatField.onChange('');
    setAutoDetectedFormat('');
    setFormatSelectionSource('none');
  }, [
    formatField.onChange,
    formatField.value,
    formatSelectionSource,
    handleFormatSelection,
    isEditMode,
    resource,
    syncedResourceRef,
  ]);

  const formatSuperSelectOptions = useMemo(() => {
    const autoDetectedSuffix = ` ${datasetWizardStrings.formatAutoDetectedSuffix()}`;

    return FORMAT_SUPER_SELECT_OPTIONS().map((option) => {
      const isSelectedAutoDetected = option.value === format && option.value === autoDetectedFormat;

      if (!isSelectedAutoDetected) {
        return option;
      }

      return {
        ...option,
        inputDisplay: (
          <>
            {option.inputDisplay}
            {autoDetectedSuffix}
          </>
        ),
      };
    });
  }, [autoDetectedFormat, format]);

  const accordionTitles = useMemo(
    () => ({
      structure: datasetWizardStrings.accordionStructureAndSchema(),
      textParsing: datasetWizardStrings.accordionTextParsing(),
      columns: datasetWizardStrings.accordionColumnsAndValues(),
      errorHandling: datasetWizardStrings.accordionErrorHandling(),
      limits: datasetWizardStrings.accordionLimitsAndPerformance(),
    }),
    []
  );

  return (
    <div data-test-subj="datasetWizardAdditionalSettingsStep">
      <EuiTitle size="s">
        <h3>{datasetWizardStrings.additionalSettingsTitle()}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>{datasetWizardStrings.additionalSettingsDescription()}</p>
      </EuiText>
      <EuiSpacer size="l" />

      <EuiForm component="div">
        <EuiFormRow label={createDatasetFlyoutStrings.settingsFormatLabel()} fullWidth>
          <EuiSuperSelect
            options={formatSuperSelectOptions}
            data-test-subj="datasetWizardSettingsFormat"
            fullWidth
            aria-label={createDatasetFlyoutStrings.settingsFormatLabel()}
            placeholder={createDatasetFlyoutStrings.settingsFormatPlaceholder()}
            valueOfSelected={hasFormatSelected ? format : undefined}
            onChange={(nextFormat) => {
              handleFormatSelection(nextFormat, 'manual');
            }}
            name={formatField.name}
            buttonRef={formatField.ref}
          />
        </EuiFormRow>

        {hasFormatSelected ? (
          <>
            <DatasetSettingsCommonPanel
              control={control}
              format={format}
              panelTitle={datasetWizardStrings.commonSettingsTitle()}
              testSubjPrefix="datasetWizard"
            />
            <DatasetSettingsAccordions
              control={control}
              format={format}
              accordionTitles={accordionTitles}
              testSubjPrefix="datasetWizard"
            />
          </>
        ) : null}
      </EuiForm>
    </div>
  );
};
