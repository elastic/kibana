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
import type { Control } from 'react-hook-form';
import { useWatch } from 'react-hook-form';

import type {
  DatasetErrorModeFormValue,
  DatasetFormatFormValue,
} from './create_dataset_flyout_form_state';
import { DatasetSettingsCustomJsonEditor } from './dataset_settings_custom_json_editor';
import { DatasetSettingsFieldsLayout } from './dataset_settings_fields_layout';
import {
  getFlow3AdvancedFields,
  getFlow3CommonFields,
  getFlow3bAdvancedFields,
} from './dataset_settings_flow3_layout';
import type { DatasetWizardFlowVariant } from '../create_dataset_wizard/dataset_wizard_flow_variant';
import { isDatasetWizardFlow3B } from '../create_dataset_wizard/dataset_wizard_flow_variant';
import type { DatasetWizardFormValues } from '../create_dataset_wizard/dataset_wizard_form_state';

const accordionButtonCss = css`
  &:hover {
    text-decoration: none;
  }
`;

export interface DatasetSettingsFlow3SettingsPanelProps {
  control: Control<DatasetWizardFormValues>;
  format: Exclude<DatasetFormatFormValue, ''>;
  flowVariant: DatasetWizardFlowVariant;
  commonSettingsTitle: string;
  advancedSettingsTitle: string;
  testSubjPrefix?: string;
}

export const DatasetSettingsFlow3SettingsPanel: FunctionComponent<
  DatasetSettingsFlow3SettingsPanelProps
> = ({
  control,
  format,
  flowVariant,
  commonSettingsTitle,
  advancedSettingsTitle,
  testSubjPrefix = 'datasetWizard',
}) => {
  const isFlow3b = isDatasetWizardFlow3B(flowVariant);
  const errorMode = useWatch({ control, name: 'settings.error_mode' }) as DatasetErrorModeFormValue;

  const commonFields = useMemo(
    () => getFlow3CommonFields(format, errorMode),
    [errorMode, format]
  );
  const advancedFields = useMemo(() => {
    if (isFlow3b) {
      return getFlow3bAdvancedFields(format, errorMode);
    }

    return getFlow3AdvancedFields(format, errorMode);
  }, [errorMode, format, isFlow3b]);

  const advancedSettingsAccordionId = useGeneratedHtmlId({
    prefix: isFlow3b
      ? 'datasetWizardFlow3bAdvancedSettingsAccordion'
      : 'datasetWizardFlow3AdvancedSettingsAccordion',
  });

  const showAdvancedSection = isFlow3b || advancedFields.length > 0;

  return (
    <>
      <EuiSpacer size="l" />
      <EuiPanel
        color="subdued"
        paddingSize="m"
        hasShadow={false}
        data-test-subj={`${testSubjPrefix}Flow3CommonSettingsPanel`}
      >
        <EuiTitle size="xs">
          <h3>{commonSettingsTitle}</h3>
        </EuiTitle>
        <EuiSpacer size="m" />
        <DatasetSettingsFieldsLayout
          control={control}
          fields={commonFields}
          testSubjPrefix={testSubjPrefix}
          columns={2}
        />
      </EuiPanel>

      {showAdvancedSection ? (
        <>
          <EuiSpacer size="l" />
          <EuiAccordion
            id={advancedSettingsAccordionId}
            element="fieldset"
            borders="horizontal"
            buttonProps={{ paddingSize: 'm', css: accordionButtonCss }}
            buttonContent={
              <EuiTitle size="xs">
                <h3>{advancedSettingsTitle}</h3>
              </EuiTitle>
            }
            data-test-subj={
              isFlow3b
                ? `${testSubjPrefix}Flow3bAdvancedSettingsAccordion`
                : `${testSubjPrefix}Flow3AdvancedSettingsAccordion`
            }
            initialIsOpen={false}
            paddingSize="none"
          >
            <EuiPanel color="subdued" paddingSize="m" hasShadow={false}>
              {advancedFields.length > 0 ? (
                <DatasetSettingsFieldsLayout
                  control={control}
                  fields={advancedFields}
                  testSubjPrefix={testSubjPrefix}
                  columns={2}
                />
              ) : null}
              {isFlow3b ? (
                <>
                  {advancedFields.length > 0 ? <EuiSpacer size="l" /> : null}
                  <DatasetSettingsCustomJsonEditor
                    control={control}
                    testSubjPrefix={testSubjPrefix}
                  />
                </>
              ) : null}
            </EuiPanel>
          </EuiAccordion>
        </>
      ) : null}
    </>
  );
};
