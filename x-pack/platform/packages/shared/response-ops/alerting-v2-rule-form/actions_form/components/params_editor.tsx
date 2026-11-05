/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow } from '@elastic/eui';
import type { ActionVariable } from '@kbn/alerting-types';
import { AddMessageVariables } from '@kbn/alerts-ui-shared';
import { CodeEditor, type monaco } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useRef } from 'react';
import { createPayloadCompletionProvider } from '../completion/payload_completion_provider';
import { getVariableInsertText } from '../helpers/get_variable_insert_text';
import { getPayloadTemplateVariables } from '../registry';

const PAYLOAD_COMPLETION_PROVIDER = createPayloadCompletionProvider();
const PAYLOAD_TEMPLATE_VARIABLES = getPayloadTemplateVariables();
const EDITOR_EDIT_SOURCE = 'paramsEditorAddVariable';

const EDITOR_OPTIONS = {
  tabSize: 2,
  minimap: { enabled: false },
  lineNumbers: 'on',
  wordWrap: 'on',
  scrollBeyondLastLine: false,
  automaticLayout: true,
} as const;

interface ParamsEditorProps {
  value: string;
  onChange: (next: string) => void;
  height?: string | number;
  errors?: string[];
}

export const ParamsEditor = ({ value, onChange, height = 200, errors = [] }: ParamsEditorProps) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  // Monaco reports a 1:1 selection before the editor is first focused, which is not a real cursor.
  const hasFocusedRef = useRef(false);

  const onEditorMount = useCallback((editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    hasFocusedRef.current = false;
    editor.onDidFocusEditorText(() => {
      hasFocusedRef.current = true;
    });
  }, []);

  const onSelectVariable = useCallback(
    ({ name }: ActionVariable) => {
      const editor = editorRef.current;
      const model = editor?.getModel();
      if (!editor || !model) {
        onChange(`${value}${getVariableInsertText(name, value, '')}`);
        return;
      }

      const end = model.getFullModelRange().getEndPosition();
      const range: monaco.IRange = (hasFocusedRef.current && editor.getSelection()) || {
        startLineNumber: end.lineNumber,
        startColumn: end.column,
        endLineNumber: end.lineNumber,
        endColumn: end.column,
      };
      const source = model.getValue();
      const startOffset = model.getOffsetAt({
        lineNumber: range.startLineNumber,
        column: range.startColumn,
      });
      const endOffset = model.getOffsetAt({
        lineNumber: range.endLineNumber,
        column: range.endColumn,
      });
      const text = getVariableInsertText(
        name,
        source.slice(0, startOffset),
        source.slice(endOffset)
      );

      editor.executeEdits(EDITOR_EDIT_SOURCE, [{ range, text, forceMoveMarkers: true }]);
      editor.setPosition(model.getPositionAt(startOffset + text.length));
      editor.focus();
    },
    [onChange, value]
  );

  return (
    <EuiFormRow
      label={i18n.translate('xpack.alertingV2.alertingV2RuleForm.actionForm.params.label', {
        defaultMessage: 'Parameters',
      })}
      labelAppend={
        <AddMessageVariables
          messageVariables={PAYLOAD_TEMPLATE_VARIABLES}
          paramsProperty="singleStepWorkflowParams"
          onSelectEventHandler={onSelectVariable}
        />
      }
      helpText={i18n.translate('xpack.alertingV2.alertingV2RuleForm.actionForm.params.helpText', {
        defaultMessage:
          'Use {syntax} to reference dispatcher payload values such as {policyId}, {groupKey}, or {alerts}.',
        values: {
          syntax: '{{ ... }}',
          policyId: '{{ inputs.payload.policyId }}',
          groupKey: '{{ inputs.payload.groupKey }}',
          alerts: '{{ inputs.payload.alerts }}',
        },
      })}
      fullWidth
      isInvalid={errors.length > 0}
      error={errors}
    >
      <CodeEditor
        languageId="yaml"
        value={value}
        onChange={onChange}
        height={height}
        width="100%"
        suggestionProvider={PAYLOAD_COMPLETION_PROVIDER}
        options={EDITOR_OPTIONS}
        editorDidMount={onEditorMount}
        dataTestSubj="singleStepWorkflowParamsEditor"
        aria-label={i18n.translate(
          'xpack.alertingV2.alertingV2RuleForm.actionForm.params.ariaLabel',
          {
            defaultMessage: 'Workflow parameters editor',
          }
        )}
      />
    </EuiFormRow>
  );
};
