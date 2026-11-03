/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiButtonIcon, EuiFormRow, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CodeEditorProps } from '@kbn/code-editor';
import { useController, useFormContext } from 'react-hook-form';
import type { BuildConnectorFormData } from './types';
import { formatJson, parseJsonObject } from './json_body';
import { ResizableCodeEditor } from './resizable_code_editor';

interface Props {
  actionIndex: number;
  testSubj: string;
}

const EDITOR_OPTIONS: CodeEditorProps['options'] = {
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  wordWrap: 'on',
  automaticLayout: true,
  tabSize: 2,
  folding: false,
};

const BEAUTIFY_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.buildConnectorFlyout.beautifyJsonButtonLabel',
  { defaultMessage: 'Beautify JSON' }
);

/** JSON editor for an action's request body, validated as you type. */
const JsonBodyEditorComponent: React.FC<Props> = ({ actionIndex, testSubj }) => {
  const { control } = useFormContext<BuildConnectorFormData>();
  const {
    field,
    fieldState: { error },
  } = useController({ control, name: `actions.${actionIndex}.request.body` });
  const value = field.value ?? '';
  const syntaxError = useMemo(() => parseJsonObject(value).error, [value]);
  const message = syntaxError ?? error?.message;

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.triggersActionsUI.sections.buildConnectorFlyout.bodyFieldLabel',
        {
          defaultMessage: 'Body (JSON)',
        }
      )}
      labelAppend={
        <EuiToolTip content={BEAUTIFY_LABEL} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="brush"
            size="xs"
            aria-label={BEAUTIFY_LABEL}
            isDisabled={!value.trim() || !!syntaxError}
            onClick={() => field.onChange(formatJson(value))}
            data-test-subj={`${testSubj}-beautify`}
          />
        </EuiToolTip>
      }
      helpText={i18n.translate(
        'xpack.triggersActionsUI.sections.buildConnectorFlyout.bodyFieldHelpText',
        {
          defaultMessage: 'Optional. String values can reference {config}, {params} and {secrets}.',
          values: {
            config: '{{config.<name>}}',
            params: '{{params.<name>}}',
            secrets: '{{secrets.<name>}}',
          },
        }
      )}
      fullWidth
      isInvalid={!!message}
      error={message}
      data-test-subj={testSubj}
    >
      <ResizableCodeEditor
        languageId="json"
        value={value}
        onChange={field.onChange}
        defaultHeight={160}
        minHeight={100}
        options={EDITOR_OPTIONS}
        onBlur={field.onBlur}
        dataTestSubj={`${testSubj}-editor`}
      />
    </EuiFormRow>
  );
};

export const JsonBodyEditor = memo(JsonBodyEditorComponent);
