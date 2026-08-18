/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent, MouseEvent } from 'react';
import React from 'react';
import { EuiCode, EuiFormRow, EuiLink } from '@elastic/eui';
import { CodeEditor } from '@kbn/code-editor';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';

import { datasetWizardStrings } from '../create_dataset_wizard/dataset_wizard_i18n';
import type { DatasetWizardFormValues } from '../create_dataset_wizard/dataset_wizard_form_state';
import {
  EMPTY_SETTINGS_CUSTOM_JSON,
  validateSettingsCustomJson,
} from './settings_custom_json_utils';

const CUSTOM_JSON_EDITOR_HEIGHT = 140;

const preventFakeLinkNavigation = (event: MouseEvent) => {
  event.preventDefault();
};

export interface DatasetSettingsCustomJsonEditorProps {
  control: Control<DatasetWizardFormValues>;
  testSubjPrefix?: string;
}

export const DatasetSettingsCustomJsonEditor: FunctionComponent<
  DatasetSettingsCustomJsonEditorProps
> = ({ control, testSubjPrefix = 'datasetWizard' }) => {
  const { field, fieldState } = useController({
    name: 'settings_custom_json',
    control,
    rules: {
      validate: validateSettingsCustomJson,
    },
  });

  return (
    <EuiFormRow
      label={datasetWizardStrings.settingsCustomJsonLabel()}
      helpText={
        <>
          {datasetWizardStrings.settingsCustomJsonHelpText()}{' '}
          <EuiCode>{'{ "quote": "\\"" }'}</EuiCode>
          <br />
          {datasetWizardStrings.settingsCustomJsonHelpTextDocsPrefix()}{' '}
          <EuiLink
            href="#"
            external
            onClick={preventFakeLinkNavigation}
            data-test-subj={`${testSubjPrefix}SettingsCustomJsonDocsLink`}
          >
            {datasetWizardStrings.settingsCustomJsonDocsLinkLabel()}
          </EuiLink>{' '}
          {datasetWizardStrings.settingsCustomJsonHelpTextDocsSuffix()}
        </>
      }
      fullWidth
      isInvalid={Boolean(fieldState.error)}
      error={fieldState.error?.message}
    >
      <CodeEditor
        languageId="json"
        value={field.value || EMPTY_SETTINGS_CUSTOM_JSON}
        data-test-subj={`${testSubjPrefix}SettingsCustomJsonEditor`}
        height={CUSTOM_JSON_EDITOR_HEIGHT}
        options={{
          lineNumbers: 'on',
          tabSize: 2,
          automaticLayout: true,
        }}
        aria-label={datasetWizardStrings.settingsCustomJsonAriaLabel()}
        onChange={(value) => field.onChange(value)}
      />
    </EuiFormRow>
  );
};
