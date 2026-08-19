/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent, MouseEvent } from 'react';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { EuiFormRow, EuiLink } from '@elastic/eui';
import { CodeEditor, monaco } from '@kbn/code-editor';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';

import { datasetWizardStrings } from '../create_dataset_wizard/dataset_wizard_i18n';
import type { DatasetWizardFormValues } from '../create_dataset_wizard/dataset_wizard_form_state';
import type {
  DatasetErrorModeFormValue,
  DatasetFormatFormValue,
} from './create_dataset_flyout_form_state';
import {
  DATASET_SETTINGS_CUSTOM_JSON_SCHEMA_URI,
  getDatasetSettingsCustomJsonSchema,
} from './settings_custom_json_schema';
import {
  EMPTY_SETTINGS_CUSTOM_JSON,
  validateSettingsCustomJson,
} from './settings_custom_json_utils';

const CUSTOM_JSON_EDITOR_HEIGHT = 285;

const preventFakeLinkNavigation = (event: MouseEvent) => {
  event.preventDefault();
};

const configureDatasetSettingsCustomJsonSchema = (
  editor: monaco.editor.IStandaloneCodeEditor,
  schema: ReturnType<typeof getDatasetSettingsCustomJsonSchema>
) => {
  const modelUri = editor.getModel()?.uri.toString();

  if (!modelUri) {
    return;
  }

  const existingSchemas = monaco.languages.json.jsonDefaults.diagnosticsOptions.schemas ?? [];

  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    ...monaco.languages.json.jsonDefaults.diagnosticsOptions,
    validate: true,
    allowComments: true,
    enableSchemaRequest: false,
    schemaValidation: 'warning',
    schemas: [
      ...existingSchemas.filter((entry) => entry.uri !== DATASET_SETTINGS_CUSTOM_JSON_SCHEMA_URI),
      {
        uri: DATASET_SETTINGS_CUSTOM_JSON_SCHEMA_URI,
        fileMatch: [modelUri],
        schema,
      },
    ],
  });
};

export interface DatasetSettingsCustomJsonEditorProps {
  control: Control<DatasetWizardFormValues>;
  format: Exclude<DatasetFormatFormValue, ''>;
  errorMode?: DatasetErrorModeFormValue;
  hideLabel?: boolean;
  testSubjPrefix?: string;
}

export const DatasetSettingsCustomJsonEditor: FunctionComponent<
  DatasetSettingsCustomJsonEditorProps
> = ({ control, format, errorMode = '', hideLabel = false, testSubjPrefix = 'datasetWizard' }) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const jsonSchema = useMemo(
    () => getDatasetSettingsCustomJsonSchema(format, errorMode),
    [errorMode, format]
  );

  const { field, fieldState } = useController({
    name: 'settings_custom_json',
    control,
    rules: {
      validate: validateSettingsCustomJson,
    },
  });

  const handleEditorDidMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      editorRef.current = editor;
      configureDatasetSettingsCustomJsonSchema(editor, jsonSchema);
    },
    [jsonSchema]
  );

  useEffect(() => {
    if (editorRef.current) {
      configureDatasetSettingsCustomJsonSchema(editorRef.current, jsonSchema);
    }
  }, [jsonSchema]);

  return (
    <EuiFormRow
      label={hideLabel ? undefined : datasetWizardStrings.settingsCustomJsonLabel()}
      helpText={
        <>
          {datasetWizardStrings.settingsCustomJsonHelpText()}{' '}
          <EuiLink
            href="#"
            external
            onClick={preventFakeLinkNavigation}
            data-test-subj={`${testSubjPrefix}SettingsCustomJsonDocsLink`}
          >
            {datasetWizardStrings.settingsCustomJsonDocsLinkLabel()}
          </EuiLink>
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
          quickSuggestions: {
            other: true,
            comments: false,
            strings: true,
          },
          suggestOnTriggerCharacters: true,
        }}
        aria-label={datasetWizardStrings.settingsCustomJsonAriaLabel()}
        editorDidMount={handleEditorDidMount}
        onChange={(value) => field.onChange(value)}
      />
    </EuiFormRow>
  );
};
