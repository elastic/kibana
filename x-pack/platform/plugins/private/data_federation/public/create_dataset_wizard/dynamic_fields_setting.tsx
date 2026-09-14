/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent, ReactNode } from 'react';
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSpacer, EuiSwitch, EuiText, EuiTitle } from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';

import type { DatasetWizardFormValues } from './dataset_wizard_form_state';
import { datasetWizardStrings } from './dataset_wizard_i18n';

export interface DynamicFieldsSettingProps {
  control: Control<DatasetWizardFormValues>;
  layout?: 'formRow' | 'section';
  /** When set, shown below the section title row instead of the dynamic-fields help copy. */
  sectionDescription?: ReactNode;
  /** Hides the description under the section title row (help copy lives elsewhere). */
  hideSectionDescription?: boolean;
}

/** Whether the fields a user leaves unmapped are still inferred at query time. */
export const DynamicFieldsSetting: FunctionComponent<DynamicFieldsSettingProps> = ({
  control,
  layout = 'formRow',
  sectionDescription,
  hideSectionDescription = false,
}) => {
  const { field } = useController({ control, name: 'dynamic_fields_enabled' });
  const isEnabled = field.value !== false;

  const switchControl = (
    <EuiSwitch
      compressed
      label={
        layout === 'section'
          ? datasetWizardStrings.dynamicFieldsEnabledToggle()
          : datasetWizardStrings.dynamicFieldsTitle()
      }
      checked={isEnabled}
      onChange={(event) => field.onChange(event.target.checked)}
      data-test-subj="datasetWizardDynamicFieldsEnabled"
    />
  );

  const description = isEnabled
    ? datasetWizardStrings.dynamicFieldsEnabledHelp()
    : datasetWizardStrings.dynamicFieldsDisabled();

  if (layout === 'section') {
    return (
      <div data-test-subj="datasetWizardDynamicFieldsSetting">
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h4>{datasetWizardStrings.dynamicFieldsTitle()}</h4>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{switchControl}</EuiFlexItem>
        </EuiFlexGroup>
        {!hideSectionDescription && (sectionDescription ?? description) ? (
          <>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              {sectionDescription ?? <p>{description}</p>}
            </EuiText>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <EuiFormRow
      fullWidth
      helpText={description}
      data-test-subj="datasetWizardDynamicFieldsSetting"
    >
      {switchControl}
    </EuiFormRow>
  );
};
