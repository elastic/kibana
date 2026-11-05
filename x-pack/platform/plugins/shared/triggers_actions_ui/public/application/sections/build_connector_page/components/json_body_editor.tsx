/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useContext, useMemo } from 'react';
import { EuiButtonIcon, EuiFormRow, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CodeEditorProps } from '@kbn/code-editor';
import { useController, useFormContext } from 'react-hook-form';
import type { BuildConnectorFormData, RequestPath } from '../types';
import { formatJson, parseJsonObject } from '../lib/json_body';
import { ResizableCodeEditor } from './resizable_code_editor';
import { ConnectorTypeReadOnlyContext } from './connector_type_read_only_context';

interface Props {
  requestPath: RequestPath;
  testSubj: string;
  /** The connection test has no action input to reference. */
  allowInputReferences?: boolean;
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
  'xpack.triggersActionsUI.sections.buildConnectorPage.beautifyJsonButtonLabel',
  { defaultMessage: 'Beautify JSON' }
);

/** JSON editor for a request body, validated as you type. */
const JsonBodyEditorComponent: React.FC<Props> = ({
  requestPath,
  testSubj,
  allowInputReferences = true,
}) => {
  const { control } = useFormContext<BuildConnectorFormData>();
  const {
    field,
    fieldState: { error },
  } = useController({ control, name: `${requestPath}.body` });
  const value = field.value ?? '';
  const isReadOnly = useContext(ConnectorTypeReadOnlyContext);
  const syntaxError = useMemo(() => parseJsonObject(value).error, [value]);
  const message = syntaxError ?? error?.message;

  return (
    <EuiFormRow
      label={i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.bodyFieldLabel', {
        defaultMessage: 'Body (JSON)',
      })}
      labelAppend={
        <EuiToolTip content={BEAUTIFY_LABEL} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="brush"
            size="xs"
            aria-label={BEAUTIFY_LABEL}
            isDisabled={isReadOnly || !value.trim() || !!syntaxError}
            onClick={() => field.onChange(formatJson(value))}
            data-test-subj={`${testSubj}-beautify`}
          />
        </EuiToolTip>
      }
      helpText={
        allowInputReferences
          ? i18n.translate(
              'xpack.triggersActionsUI.sections.buildConnectorPage.bodyFieldHelpText',
              {
                defaultMessage:
                  'Optional. String values can reference {config}, {input} and {secrets}.',
                values: {
                  config: '{{config.<name>}}',
                  input: '{{input.<name>}}',
                  secrets: '{{secrets.<name>}}',
                },
              }
            )
          : i18n.translate(
              'xpack.triggersActionsUI.sections.buildConnectorPage.testBodyFieldHelpText',
              {
                defaultMessage: 'Optional. String values can reference {config} and {secrets}.',
                values: { config: '{{config.<name>}}', secrets: '{{secrets.<name>}}' },
              }
            )
      }
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
        options={isReadOnly ? { ...EDITOR_OPTIONS, readOnly: true } : EDITOR_OPTIONS}
        onBlur={field.onBlur}
        dataTestSubj={`${testSubj}-editor`}
      />
    </EuiFormRow>
  );
};

export const JsonBodyEditor = memo(JsonBodyEditorComponent);
