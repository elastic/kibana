/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFormRow } from '@elastic/eui';
import { actionPolicyWorkflowPayloadSchema } from '@kbn/alerting-v2-schemas';
import { CodeEditor, jsonDefaults, type monaco } from '@kbn/code-editor';
import { normalizeJsonSchemaTypeArrays, z } from '@kbn/zod/v4';
import React, { useEffect, useState } from 'react';
import * as labels from './translations';

const SCHEMA_URI = 'inmemory://schemas/alerting-v2-action-policy-workflow-payload';

/** JSON Schema of the workflow payload, for the editor diagnostics. */
export const getPayloadJsonSchema = () =>
  normalizeJsonSchemaTypeArrays(z.toJSONSchema(actionPolicyWorkflowPayloadSchema, { io: 'input' }));

interface Props {
  value: string;
  generatedValue: string;
  errors: string[];
  onChange: (value: string) => void;
  onReset: () => void;
}

export const PayloadEditor = ({ value, generatedValue, errors, onChange, onReset }: Props) => {
  const [modelUri, setModelUri] = useState<string>();

  useEffect(() => {
    if (!modelUri) {
      return;
    }
    const previousOptions = jsonDefaults.diagnosticsOptions;
    jsonDefaults.setDiagnosticsOptions({
      ...previousOptions,
      validate: true,
      allowComments: false,
      enableSchemaRequest: false,
      schemas: [
        ...(previousOptions.schemas ?? []),
        {
          uri: SCHEMA_URI,
          fileMatch: [modelUri],
          schema: getPayloadJsonSchema(),
        },
      ],
    });

    return () => {
      // Remove only this editor's schema, so a JSON editor mounted meanwhile keeps its own.
      const { schemas = [] } = jsonDefaults.diagnosticsOptions;
      jsonDefaults.setDiagnosticsOptions({
        ...previousOptions,
        schemas: schemas.filter(({ uri }) => uri !== SCHEMA_URI),
      });
    };
  }, [modelUri]);

  const onEditorMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    setModelUri(editor.getModel()?.uri.toString());
  };

  return (
    <EuiFormRow
      fullWidth
      helpText={labels.PAYLOAD_EDITOR_HELP}
      isInvalid={errors.length > 0}
      error={errors}
      labelAppend={
        <EuiButtonEmpty
          size="xs"
          iconType="refresh"
          onClick={onReset}
          isDisabled={value === generatedValue}
          aria-label={labels.RESET_PAYLOAD_ARIA}
          data-test-subj="sendTestNotificationResetPayloadButton"
        >
          {labels.RESET_PAYLOAD}
        </EuiButtonEmpty>
      }
    >
      <CodeEditor
        languageId="json"
        aria-label={labels.PAYLOAD_TITLE}
        value={value}
        onChange={onChange}
        editorDidMount={onEditorMount}
        width="100%"
        height={480}
        dataTestSubj="sendTestNotificationPayloadEditor"
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          automaticLayout: true,
          lineNumbers: 'on',
          tabSize: 2,
          insertSpaces: true,
          fontSize: 12,
          quickSuggestions: false,
          suggestOnTriggerCharacters: false,
          wordBasedSuggestions: 'off',
        }}
      />
    </EuiFormRow>
  );
};
