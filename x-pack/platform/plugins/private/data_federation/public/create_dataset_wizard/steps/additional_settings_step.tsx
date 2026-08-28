/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent, MutableRefObject } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiCallOut,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { Control, UseFormGetValues, UseFormSetValue } from 'react-hook-form';
import { useController, useWatch } from 'react-hook-form';

import { DatasetSettingsAccordions } from '../../create_dataset_flyout/dataset_settings_accordions';
import { DatasetSettingsCommonPanel } from '../../create_dataset_flyout/dataset_settings_common_panel';
import { datasetSettingsFieldsWidthCss } from '../../create_dataset_flyout/dataset_settings_fields_layout';
import { DatasetSettingsFlow3SettingsPanel } from '../../create_dataset_flyout/dataset_settings_flow3_settings_panel';
import { applySettingsForFormat } from '../../create_dataset_flyout/dataset_settings_defaults';
import { buildDefaultSettingsCustomJson } from '../../create_dataset_flyout/settings_custom_json_schema';
import { EMPTY_SETTINGS_CUSTOM_JSON } from '../../create_dataset_flyout/settings_custom_json_utils';
import { FORMAT_SUPER_SELECT_OPTIONS } from '../../create_dataset_flyout/dataset_settings_options';
import type {
  DatasetErrorModeFormValue,
  DatasetFormatFormValue,
} from '../../create_dataset_flyout/create_dataset_flyout_form_state';
import { emptyCreateDatasetSettingsFormValues } from '../../create_dataset_flyout/create_dataset_flyout_form_state';
import { createDatasetFlyoutStrings } from '../../create_dataset_flyout/create_dataset_flyout_i18n';
import { AutoDetectedSuffix } from '../auto_detected_suffix';
import { datasetWizardStrings } from '../dataset_wizard_i18n';
import {
  DATASET_WIZARD_FLOW_VARIANT_1,
  isDatasetWizardFlow3,
  isDatasetWizardFlow396,
  isDatasetWizardFlow4,
  type DatasetWizardFlowVariant,
} from '../dataset_wizard_flow_variant';
import type { DatasetWizardFormValues } from '../dataset_wizard_form_state';
import { inferFormatFromResource } from '../infer_format_from_resource';
import { WizardRegionField } from '../wizard_region_field';

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
  flowVariant: DatasetWizardFlowVariant;
  autoDetectedRegion?: string;
  onRegionManualChange?: (regionId: string) => void;
}

export const AdditionalSettingsStep: FunctionComponent<AdditionalSettingsStepProps> = ({
  control,
  getValues,
  setValue,
  resource,
  syncedResourceRef,
  isEditMode,
  flowVariant,
  autoDetectedRegion = '',
  onRegionManualChange,
}) => {
  const [autoDetectedFormat, setAutoDetectedFormat] = useState<DatasetFormatFormValue | ''>('');
  const [formatSelectionSource, setFormatSelectionSource] = useState<FormatSelectionSource>('none');

  const { field: formatField } = useController({
    name: 'settings.format',
    control,
  });

  const format = formatField.value as DatasetFormatFormValue;
  const hasFormatSelected = isKnownFormat(format);
  const errorMode = useWatch({ control, name: 'settings.error_mode' }) as DatasetErrorModeFormValue;
  const previousErrorModeRef = useRef<DatasetErrorModeFormValue | undefined>(undefined);

  const setDefaultCustomJson = useCallback(
    (
      nextFormat: Exclude<DatasetFormatFormValue, ''>,
      nextErrorMode: DatasetErrorModeFormValue = ''
    ) => {
      setValue('settings_custom_json', buildDefaultSettingsCustomJson(nextFormat, nextErrorMode), {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
    [setValue]
  );

  const applyFormatDefaultsToForm = useCallback(
    (nextFormat: Exclude<DatasetFormatFormValue, ''>) => {
      const withDefaults = applySettingsForFormat(getValues('settings'), nextFormat);
      setValue('settings', withDefaults, { shouldDirty: true, shouldValidate: true });

      if (isDatasetWizardFlow3(flowVariant)) {
        setDefaultCustomJson(nextFormat, withDefaults.error_mode);
        previousErrorModeRef.current = withDefaults.error_mode;
      }
    },
    [flowVariant, getValues, setDefaultCustomJson, setValue]
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
    if (!isDatasetWizardFlow3(flowVariant) || !hasFormatSelected) {
      previousErrorModeRef.current = errorMode;
      return;
    }

    if (previousErrorModeRef.current === undefined) {
      previousErrorModeRef.current = errorMode;
      return;
    }

    if (previousErrorModeRef.current === errorMode) {
      return;
    }

    previousErrorModeRef.current = errorMode;
    setDefaultCustomJson(format, errorMode);
  }, [errorMode, flowVariant, format, hasFormatSelected, setDefaultCustomJson]);

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

    setValue('settings', emptyCreateDatasetSettingsFormValues(), {
      shouldDirty: true,
      shouldValidate: true,
    });
    if (isDatasetWizardFlow3(flowVariant)) {
      setValue('settings_custom_json', EMPTY_SETTINGS_CUSTOM_JSON, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    setAutoDetectedFormat('');
    setFormatSelectionSource('none');
  }, [
    flowVariant,
    formatField.onChange,
    formatField.value,
    formatSelectionSource,
    handleFormatSelection,
    isEditMode,
    resource,
    setValue,
    syncedResourceRef,
  ]);

  const formatSuperSelectOptions = useMemo(() => {
    const autoDetectedSuffix =
      flowVariant === DATASET_WIZARD_FLOW_VARIANT_1
        ? ` ${datasetWizardStrings.formatAutoDetectedSuffix()}`
        : null;

    return FORMAT_SUPER_SELECT_OPTIONS().map((option) => {
      const isSelectedAutoDetected = option.value === format && option.value === autoDetectedFormat;

      if (!isSelectedAutoDetected) {
        return option;
      }

      return {
        ...option,
        inputDisplay: (
          <>
            {option.inputDisplay}{' '}
            {flowVariant === DATASET_WIZARD_FLOW_VARIANT_1 ? (
              autoDetectedSuffix
            ) : (
              <AutoDetectedSuffix />
            )}
          </>
        ),
      };
    });
  }, [autoDetectedFormat, flowVariant, format]);

  const showDataSourceSetupWarning = useMemo(
    () =>
      isDatasetWizardFlow3(flowVariant) &&
      !isDatasetWizardFlow396(flowVariant) &&
      !autoDetectedRegion &&
      !autoDetectedFormat,
    [autoDetectedFormat, autoDetectedRegion, flowVariant]
  );

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
        <h3>
          {isDatasetWizardFlow3(flowVariant)
            ? datasetWizardStrings.additionalSettingsTitleFlow3()
            : datasetWizardStrings.additionalSettingsTitle()}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>{datasetWizardStrings.additionalSettingsDescription()}</p>
      </EuiText>
      {showDataSourceSetupWarning ? (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            announceOnMount
            color="primary"
            iconType="info"
            size="s"
            title={datasetWizardStrings.dataSourceSetupWarningTitle()}
            data-test-subj="datasetWizardDataSourceSetupWarning"
          />
        </>
      ) : null}
      <EuiSpacer size="l" />

      <EuiForm component="div">
        <div css={isDatasetWizardFlow3(flowVariant) ? datasetSettingsFieldsWidthCss : undefined}>
          {isDatasetWizardFlow3(flowVariant) && !isDatasetWizardFlow4(flowVariant) ? (
            <WizardRegionField
              control={control}
              autoDetectedRegion={autoDetectedRegion}
              onRegionManualChange={onRegionManualChange}
            />
          ) : null}

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
        </div>

        {hasFormatSelected ? (
          isDatasetWizardFlow3(flowVariant) ? (
            <DatasetSettingsFlow3SettingsPanel
              control={control}
              getValues={getValues}
              setValue={setValue}
              format={format}
              commonSettingsTitle={datasetWizardStrings.commonSettingsTitle()}
              advancedSettingsTitle={datasetWizardStrings.advancedSettingsTitleFlow3()}
              testSubjPrefix="datasetWizard"
            />
          ) : (
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
          )
        ) : null}
      </EuiForm>
    </div>
  );
};
