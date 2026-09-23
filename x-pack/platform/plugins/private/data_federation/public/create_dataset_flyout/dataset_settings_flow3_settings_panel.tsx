/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useMemo } from 'react';
import { EuiSpacer, useGeneratedHtmlId } from '@elastic/eui';
import type { Control, UseFormGetValues, UseFormSetValue } from 'react-hook-form';
import { useWatch } from 'react-hook-form';

import type {
  DatasetErrorModeFormValue,
  DatasetFormatFormValue,
} from './create_dataset_flyout_form_state';
import { DatasetSettingsAdvancedViewToggle } from './dataset_settings_advanced_view_toggle';
import { DatasetSettingsFieldsLayout } from './dataset_settings_fields_layout';
import { getFlow3AdvancedFields, getFlow3CommonFields } from './dataset_settings_flow3_layout';
import {
  getActiveFlow396AdvancedFields,
  getActiveFlow396CommonFields,
} from '../create_dataset_wizard/flow_396_settings_layout';
import { DatasetSettingsSectionAccordion } from './dataset_settings_section_accordion';
import {
  isFieldVisibleForErrorMode,
  isFieldVisibleForFormat,
  type DatasetSettingsFieldId,
} from './dataset_settings_visibility';
import type { DatasetWizardFormValues } from '../create_dataset_wizard/dataset_wizard_form_state';
import { datasetWizardStepFieldsMaxWidthCss } from '../create_dataset_wizard/dataset_wizard_layout';

export interface DatasetSettingsFlow3SettingsPanelProps {
  control: Control<DatasetWizardFormValues>;
  getValues: UseFormGetValues<DatasetWizardFormValues>;
  setValue: UseFormSetValue<DatasetWizardFormValues>;
  format: Exclude<DatasetFormatFormValue, ''>;
  commonSettingsTitle: string;
  advancedSettingsTitle: string;
  testSubjPrefix?: string;
  /** When false, the fields sit directly on the page instead of a filled panel. */
  hasPanelBackground?: boolean;
  /** Settings another step asks for, so this one leaves them out. */
  excludeFieldIds?: readonly DatasetSettingsFieldId[];
  /**
   * Fields the shared layout would put with common settings, rendered in advanced
   * settings for this panel only.
   */
  promoteToAdvancedFieldIds?: readonly DatasetSettingsFieldId[];
  /** Active Flow 3 9.6 uses its own common and advanced lists. */
  useActiveFlow396Layout?: boolean;
}

export const DatasetSettingsFlow3SettingsPanel: FunctionComponent<
  DatasetSettingsFlow3SettingsPanelProps
> = ({
  control,
  getValues,
  setValue,
  format,
  commonSettingsTitle,
  advancedSettingsTitle,
  testSubjPrefix = 'datasetWizard',
  hasPanelBackground = true,
  excludeFieldIds = [],
  promoteToAdvancedFieldIds = [],
  useActiveFlow396Layout = false,
}) => {
  const errorMode = useWatch({ control, name: 'settings.error_mode' }) as DatasetErrorModeFormValue;

  const fieldsCompressed = hasPanelBackground;
  const fieldsVariant = hasPanelBackground ? 'settings' : 'step';

  const commonFields = useMemo(() => {
    const fields = useActiveFlow396Layout
      ? getActiveFlow396CommonFields(format)
      : getFlow3CommonFields(format, errorMode).filter(
          (fieldId) => !promoteToAdvancedFieldIds.includes(fieldId)
        );

    return fields.filter((fieldId) => !excludeFieldIds.includes(fieldId));
  }, [errorMode, excludeFieldIds, format, promoteToAdvancedFieldIds, useActiveFlow396Layout]);

  const advancedFields = useMemo(() => {
    if (useActiveFlow396Layout) {
      return getActiveFlow396AdvancedFields(format, errorMode).filter(
        (fieldId) => !excludeFieldIds.includes(fieldId)
      );
    }

    const promoted = promoteToAdvancedFieldIds.filter(
      (fieldId) =>
        isFieldVisibleForFormat(fieldId, format) &&
        isFieldVisibleForErrorMode(fieldId, errorMode) &&
        !excludeFieldIds.includes(fieldId)
    );

    return [
      ...promoted,
      ...getFlow3AdvancedFields(format, errorMode).filter(
        (fieldId) => !excludeFieldIds.includes(fieldId) && !promoted.includes(fieldId)
      ),
    ];
  }, [errorMode, excludeFieldIds, format, promoteToAdvancedFieldIds, useActiveFlow396Layout]);

  const commonSettingsAccordionId = useGeneratedHtmlId({
    prefix: 'datasetWizardFlow3CommonSettingsAccordion',
  });
  const advancedSettingsAccordionId = useGeneratedHtmlId({
    prefix: 'datasetWizardFlow3AdvancedSettingsAccordion',
  });

  const stepFieldsMaxWidthCss = hasPanelBackground ? undefined : datasetWizardStepFieldsMaxWidthCss;

  /**
   * Rendered even with no fields of its own, because it also keeps the custom
   * JSON in step with the form, which the review reads back.
   */
  const advancedSettings = (
    <DatasetSettingsAdvancedViewToggle
      control={control}
      getValues={getValues}
      setValue={setValue}
      format={format}
      errorMode={errorMode}
      fields={advancedFields}
      testSubjPrefix={testSubjPrefix}
      constrainWidth={hasPanelBackground}
      compressed={fieldsCompressed}
      variant={fieldsVariant}
    />
  );

  return (
    <>
      {hasPanelBackground ? <EuiSpacer size="l" /> : null}
      {commonFields.length > 0 ? (
        <DatasetSettingsSectionAccordion
          id={commonSettingsAccordionId}
          title={commonSettingsTitle}
          borders={hasPanelBackground ? 'horizontal' : 'none'}
          contentLayout={hasPanelBackground ? 'panel' : 'indentedFullWidth'}
          initialIsOpen
          dataTestSubj={`${testSubjPrefix}Flow3CommonSettingsAccordion`}
          panelDataTestSubj={`${testSubjPrefix}Flow3CommonSettingsPanel`}
          fieldsDataTestSubj={`${testSubjPrefix}Flow3CommonSettingsFields`}
          fieldsContainerCss={stepFieldsMaxWidthCss}
        >
          <DatasetSettingsFieldsLayout
            control={control}
            fields={commonFields}
            testSubjPrefix={testSubjPrefix}
            columns={1}
            rowSpacerSize="m"
            constrainWidth={hasPanelBackground}
            compressed={fieldsCompressed}
            variant={fieldsVariant}
          />
        </DatasetSettingsSectionAccordion>
      ) : null}
      {advancedFields.length > 0 ? (
        <DatasetSettingsSectionAccordion
          id={advancedSettingsAccordionId}
          title={advancedSettingsTitle}
          contentLayout={hasPanelBackground ? 'panel' : 'indentedFullWidth'}
          dataTestSubj={`${testSubjPrefix}Flow3AdvancedSettingsAccordion`}
          panelDataTestSubj={`${testSubjPrefix}Flow3AdvancedSettingsPanel`}
          fieldsDataTestSubj={`${testSubjPrefix}Flow3AdvancedSettingsFields`}
          fieldsContainerCss={stepFieldsMaxWidthCss}
        >
          {advancedSettings}
        </DatasetSettingsSectionAccordion>
      ) : (
        <div css={stepFieldsMaxWidthCss}>{advancedSettings}</div>
      )}
    </>
  );
};
