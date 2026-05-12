/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow } from '@elastic/eui';
import { CodeEditor } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { createPayloadCompletionProvider } from '../completion/payload_completion_provider';

const PAYLOAD_COMPLETION_PROVIDER = createPayloadCompletionProvider();

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
}

export const ParamsEditor = ({ value, onChange, height = 200 }: ParamsEditorProps) => (
  <EuiFormRow
    label={i18n.translate('xpack.alertingV2.singleStepWorkflow.params.label', {
      defaultMessage: 'Parameters',
    })}
    helpText={i18n.translate('xpack.alertingV2.singleStepWorkflow.params.helpText', {
      defaultMessage:
        'Use {syntax} to reference dispatcher payload values such as policyId, groupKey, or episodes.',
      values: { syntax: '{{ ... }}' },
    })}
    fullWidth
  >
    <CodeEditor
      languageId="yaml"
      value={value}
      onChange={onChange}
      height={height}
      width="100%"
      suggestionProvider={PAYLOAD_COMPLETION_PROVIDER}
      options={EDITOR_OPTIONS}
      dataTestSubj="singleStepWorkflowParamsEditor"
      aria-label={i18n.translate('xpack.alertingV2.singleStepWorkflow.params.ariaLabel', {
        defaultMessage: 'Workflow parameters editor',
      })}
    />
  </EuiFormRow>
);
