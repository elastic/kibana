/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { Control, UseFormGetValues, UseFormSetValue } from 'react-hook-form';
import { useWatch } from 'react-hook-form';

import type {
  DatasetErrorModeFormValue,
  DatasetFormatFormValue,
} from './create_dataset_flyout_form_state';
import { DatasetSettingsAdvancedViewToggle } from './dataset_settings_advanced_view_toggle';
import {
  DatasetSettingsFieldsLayout,
  getIndentedDatasetSettingsFieldsWidthCss,
} from './dataset_settings_fields_layout';
import { getFlow3CommonFields } from './dataset_settings_flow3_layout';
import type { DatasetSettingsFieldId } from './dataset_settings_visibility';
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
  /** When false, the fields sit directly on the page instead of a filled panel. */
  hasPanelBackground?: boolean;
  /** Settings another step asks for, so this one leaves them out. */
  excludeFieldIds?: readonly DatasetSettingsFieldId[];
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
}) => {
  const { euiTheme } = useEuiTheme();
  const errorMode = useWatch({ control, name: 'settings.error_mode' }) as DatasetErrorModeFormValue;

  /**
   * Without a fill to separate them, the fields read as part of the section, so
   * they line up with its title rather than with the arrow that indents it. The
   * accordion button already provides the space above. The indent is a margin
   * on the fields rather than panel padding, so that it eats into their width
   * instead of shifting their right edge past the fields in the other sections.
   */
  const panelProps = hasPanelBackground
    ? ({ color: 'subdued', paddingSize: 'm' } as const)
    : ({
        color: 'transparent',
        paddingSize: 'none',
        css: css`
          padding-block-end: ${euiTheme.size.m};
        `,
      } as const);

  const fieldsCss = hasPanelBackground
    ? undefined
    : getIndentedDatasetSettingsFieldsWidthCss([euiTheme.size.l, euiTheme.size.xs]);
  const fieldsCompressed = hasPanelBackground;

  const commonFields = useMemo(
    () =>
      getFlow3CommonFields(format, errorMode).filter(
        (fieldId) => !excludeFieldIds.includes(fieldId)
      ),
    [errorMode, excludeFieldIds, format]
  );

  const commonSettingsAccordionId = useGeneratedHtmlId({
    prefix: 'datasetWizardFlow3CommonSettingsAccordion',
  });
  const advancedSettingsAccordionId = useGeneratedHtmlId({
    prefix: 'datasetWizardFlow3AdvancedSettingsAccordion',
  });

  return (
    <>
      {hasPanelBackground ? <EuiSpacer size="l" /> : null}
      <EuiAccordion
        id={commonSettingsAccordionId}
        element="fieldset"
        borders={hasPanelBackground ? 'horizontal' : 'none'}
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
          {...panelProps}
          hasShadow={false}
          data-test-subj={`${testSubjPrefix}Flow3CommonSettingsPanel`}
        >
          <div css={fieldsCss} data-test-subj={`${testSubjPrefix}Flow3CommonSettingsFields`}>
            <DatasetSettingsFieldsLayout
              control={control}
              fields={commonFields}
              testSubjPrefix={testSubjPrefix}
              columns={1}
              rowSpacerSize="m"
              constrainWidth={hasPanelBackground}
              compressed={fieldsCompressed}
            />
          </div>
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
          {...panelProps}
          hasShadow={false}
          data-test-subj={`${testSubjPrefix}Flow3AdvancedSettingsPanel`}
        >
          <div css={fieldsCss} data-test-subj={`${testSubjPrefix}Flow3AdvancedSettingsFields`}>
            <DatasetSettingsAdvancedViewToggle
              control={control}
              getValues={getValues}
              setValue={setValue}
              format={format}
              errorMode={errorMode}
              testSubjPrefix={testSubjPrefix}
              constrainWidth={hasPanelBackground}
              compressed={fieldsCompressed}
              excludeFieldIds={excludeFieldIds}
            />
          </div>
        </EuiPanel>
      </EuiAccordion>
    </>
  );
};
