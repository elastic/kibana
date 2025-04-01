/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CodeEditor } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import dfaJsonSchema from '@kbn/json-schemas/src/put___ml_data_frame_analytics__id__schema.json';
import { monaco } from '@kbn/monaco';
import type { FC } from 'react';
import React from 'react';

export const EditorComponent: FC<{
  value: string;
  onChange: (update: string) => void;
  readOnly: boolean;
}> = ({ value, onChange, readOnly }) => {
  return (
    <CodeEditor
      languageId={'json'}
      height={500}
      languageConfiguration={{
        autoClosingPairs: [
          {
            open: '{',
            close: '}',
          },
        ],
      }}
      value={value}
      onChange={onChange}
      options={{
        ariaLabel: i18n.translate(
          'xpack.ml.dataframe.analytics.create.advancedEditor.codeEditorAriaLabel',
          {
            defaultMessage: 'Advanced analytics job editor',
          }
        ),
        automaticLayout: true,
        readOnly,
        fontSize: 12,
        scrollBeyondLastLine: false,
        quickSuggestions: true,
        minimap: {
          enabled: false,
        },
        wordWrap: 'on',
        wrappingIndent: 'indent',
      }}
      editorDidMount={(editor: monaco.editor.IStandaloneCodeEditor) => {
        const editorModelUri: string = editor.getModel()?.uri.toString()!;
        monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
          validate: true,
          enableSchemaRequest: false,
          schemaValidation: 'error',
          schemas: [
            ...(monaco.languages.json.jsonDefaults.diagnosticsOptions.schemas ?? []),
            {
              uri: editorModelUri,
              fileMatch: [editorModelUri],
              schema: dfaJsonSchema,
            },
          ],
        });
      }}
    />
  );
};
