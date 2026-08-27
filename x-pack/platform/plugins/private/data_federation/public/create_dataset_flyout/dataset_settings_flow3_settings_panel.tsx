/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiAccordion, EuiPanel, EuiSpacer, EuiTitle, useGeneratedHtmlId } from '@elastic/eui';
import type { Control, UseFormGetValues, UseFormSetValue } from 'react-hook-form';
import { useWatch } from 'react-hook-form';

import type {
  DatasetErrorModeFormValue,
  DatasetFormatFormValue,
} from './create_dataset_flyout_form_state';
import { DatasetSettingsAdvancedViewToggle } from './dataset_settings_advanced_view_toggle';
import { DatasetSettingsFieldsLayout } from './dataset_settings_fields_layout';
import { getFlow3CommonFields } from './dataset_settings_flow3_layout';
import type { DatasetWizardFormValues } from '../create_dataset_wizard/dataset_wizard_form_state';

const accordionButtonCss = css`
  &:hover {
    text-decoration: none;
  }
`;

export interface DatasetSettingsFlow3SettingsPanelProps {
  control: Control<DatasetWizardFormValues>;
  getValues: UseFormGetValues<DatasetWizardFormValues>;
  setValue: UseFormSetValue<DatasetWizardFormValues>;
  format: Exclude<DatasetFormatFormValue, ''>;
  commonSettingsTitle: string;
  advancedSettingsTitle: string;
  testSubjPrefix?: string;
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
}) => {
  const errorMode = useWatch({ control, name: 'settings.error_mode' }) as DatasetErrorModeFormValue;

  const commonFields = useMemo(() => getFlow3CommonFields(format, errorMode), [errorMode, format]);

  const commonSettingsAccordionId = useGeneratedHtmlId({
    prefix: 'datasetWizardFlow3CommonSettingsAccordion',
  });
  const advancedSettingsAccordionId = useGeneratedHtmlId({
    prefix: 'datasetWizardFlow3AdvancedSettingsAccordion',
  });

  return (
    <>
      <EuiSpacer size="l" />
      <EuiAccordion
        id={commonSettingsAccordionId}
        element="fieldset"
        borders="horizontal"
        buttonProps={{ paddingSize: 'm', css: accordionButtonCss }}
        buttonContent={
          <EuiTitle size="xs">
            <h4>{commonSettingsTitle}</h4>
          </EuiTitle>
        }
        data-test-subj={`${testSubjPrefix}Flow3CommonSettingsAccordion`}
        initialIsOpen
        paddingSize="none"
      >
        <EuiPanel
          color="subdued"
          paddingSize="m"
          hasShadow={false}
          data-test-subj={`${testSubjPrefix}Flow3CommonSettingsPanel`}
        >
          <DatasetSettingsFieldsLayout
            control={control}
            fields={commonFields}
            testSubjPrefix={testSubjPrefix}
            columns={1}
            rowSpacerSize="m"
          />
        </EuiPanel>
      </EuiAccordion>
      <EuiAccordion
        id={advancedSettingsAccordionId}
        element="fieldset"
        borders="horizontal"
        buttonProps={{ paddingSize: 'm', css: accordionButtonCss }}
        buttonContent={
          <EuiTitle size="xs">
            <h4>{advancedSettingsTitle}</h4>
          </EuiTitle>
        }
        data-test-subj={`${testSubjPrefix}Flow3AdvancedSettingsAccordion`}
        initialIsOpen={false}
        paddingSize="none"
      >
        <EuiPanel
          color="subdued"
          paddingSize="m"
          hasShadow={false}
          data-test-subj={`${testSubjPrefix}Flow3AdvancedSettingsPanel`}
        >
          <DatasetSettingsAdvancedViewToggle
            control={control}
            getValues={getValues}
            setValue={setValue}
            format={format}
            errorMode={errorMode}
            testSubjPrefix={testSubjPrefix}
          />
        </EuiPanel>
      </EuiAccordion>
    </>
  );
};
