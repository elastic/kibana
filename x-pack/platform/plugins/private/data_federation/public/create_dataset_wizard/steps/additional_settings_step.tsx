/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent, MutableRefObject } from 'react';
import React, { useMemo } from 'react';
import {
  EuiCallOut,
  EuiForm,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { Control, UseFormGetValues, UseFormSetValue } from 'react-hook-form';
import { useWatch } from 'react-hook-form';

import { DatasetSettingsAccordions } from '../../create_dataset_flyout/dataset_settings_accordions';
import { DatasetSettingsCommonPanel } from '../../create_dataset_flyout/dataset_settings_common_panel';
import { datasetSettingsFieldsWidthCss } from '../../create_dataset_flyout/dataset_settings_fields_layout';
import { DatasetSettingsFlow3SettingsPanel } from '../../create_dataset_flyout/dataset_settings_flow3_settings_panel';
import { DatasetSettingDefaultHintsProvider } from '../../create_dataset_flyout/dataset_settings_default_hints';
import type {
  DatasetErrorModeFormValue,
  DatasetFormatFormValue,
} from '../../create_dataset_flyout/create_dataset_flyout_form_state';
import { datasetWizardStrings } from '../dataset_wizard_i18n';
import {
  hasDatasetWizardRegionField,
  isDatasetWizardFlow3,
  isDatasetWizardFlow396,
  type DatasetWizardFlowVariant,
} from '../dataset_wizard_flow_variant';
import type { DatasetWizardFormValues } from '../dataset_wizard_form_state';
import { DatasetFormatField } from '../dataset_format_field';
import {
  getResourceOwnedSettingsFieldIds,
} from '../resource_settings_fields';
import { SCHEMA_MAPPING_SETTINGS_FIELD_IDS } from '../schema_mapping_settings_fields';
import { isKnownDatasetFormat, useDatasetFormatSelection } from '../use_dataset_format_selection';
import { WizardRegionField } from '../wizard_region_field';

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
  const isFlow396 = isDatasetWizardFlow396(flowVariant);
  const showFormatField = !isFlow396;
  const showDefaultsAsPlaceholders = isFlow396;
  const resourceSettingsFieldIds = useMemo(
    () => getResourceOwnedSettingsFieldIds(flowVariant),
    [flowVariant]
  );
  const excludedSettingsFieldIds = useMemo(
    () =>
      isFlow396
        ? [...resourceSettingsFieldIds, ...SCHEMA_MAPPING_SETTINGS_FIELD_IDS]
        : resourceSettingsFieldIds,
    [isFlow396, resourceSettingsFieldIds]
  );
  const errorMode = useWatch({ control, name: 'settings.error_mode' }) as DatasetErrorModeFormValue;
  const {
    formatField,
    formatFieldState,
    format,
    hasFormatSelected,
    formatSuperSelectOptions,
    handleFormatSelection,
    autoDetectedFormat,
  } = useDatasetFormatSelection({
    control,
    getValues,
    setValue,
    resource,
    flowVariant,
    isEditMode,
    resourceSettingsFieldIds,
    syncedResourceRef,
    syncMode: 'resource-change',
    enabled: showFormatField,
  });

  const showDataSourceSetupWarning = useMemo(
    () =>
      isDatasetWizardFlow3(flowVariant) &&
      !isFlow396 &&
      !autoDetectedRegion &&
      !autoDetectedFormat,
    [autoDetectedFormat, autoDetectedRegion, flowVariant, isFlow396]
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

  const resolvedFormat = hasFormatSelected
    ? format
    : (getValues('settings.format') as DatasetFormatFormValue);
  const hasResolvedFormat = isKnownDatasetFormat(resolvedFormat);

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
          {isDatasetWizardFlow3(flowVariant) && hasDatasetWizardRegionField(flowVariant) ? (
            <WizardRegionField
              control={control}
              autoDetectedRegion={autoDetectedRegion}
              onRegionManualChange={onRegionManualChange}
            />
          ) : null}

          {showFormatField ? (
            <DatasetFormatField
              formatField={formatField}
              formatFieldState={formatFieldState}
              format={format}
              hasFormatSelected={hasFormatSelected}
              formatSuperSelectOptions={formatSuperSelectOptions}
              onFormatChange={(nextFormat) => {
                handleFormatSelection(nextFormat, 'manual');
              }}
            />
          ) : null}
        </div>

        {hasResolvedFormat ? (
          <DatasetSettingDefaultHintsProvider
            format={resolvedFormat}
            isEnabled={showDefaultsAsPlaceholders}
          >
            {isDatasetWizardFlow3(flowVariant) ? (
              <DatasetSettingsFlow3SettingsPanel
                control={control}
                getValues={getValues}
                setValue={setValue}
                format={resolvedFormat}
                commonSettingsTitle={datasetWizardStrings.commonSettingsTitle()}
                advancedSettingsTitle={datasetWizardStrings.advancedSettingsTitleFlow3()}
                testSubjPrefix="datasetWizard"
                hasPanelBackground={!isFlow396}
                excludeFieldIds={excludedSettingsFieldIds}
              />
            ) : (
              <>
                <DatasetSettingsCommonPanel
                  control={control}
                  format={resolvedFormat}
                  panelTitle={datasetWizardStrings.commonSettingsTitle()}
                  testSubjPrefix="datasetWizard"
                />
                <DatasetSettingsAccordions
                  control={control}
                  format={resolvedFormat}
                  accordionTitles={accordionTitles}
                  testSubjPrefix="datasetWizard"
                />
              </>
            )}
          </DatasetSettingDefaultHintsProvider>
        ) : null}
      </EuiForm>
    </div>
  );
};
