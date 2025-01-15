/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel } from '@elastic/eui';
import React, { FunctionComponent } from 'react';
import { EuiFormRow } from '@elastic/eui';
import {
  CodeEditor,
  FieldHook,
  getFieldValidityAndErrorMessage,
} from '../../../../../../shared_imports';

import './text_editor.scss';

interface Props {
  field: FieldHook<string>;
  editorProps: { [key: string]: any };
  euiFieldProps?: Record<string, any>;
}

export const TextEditor: FunctionComponent<Props> = ({ field, editorProps, euiFieldProps }) => {
  const { value, helpText, setValue, label } = field;
  const { errorMessage } = getFieldValidityAndErrorMessage(field);

  return (
    <EuiFormRow
      label={label}
      helpText={helpText}
      isInvalid={typeof errorMessage === 'string'}
      error={errorMessage}
      fullWidth
      labelAppend={editorProps.labelAppend}
    >
      <EuiPanel
        className="pipelineProcessorsEditor__form__textEditor__panel"
        paddingSize="s"
        hasShadow={false}
        {...euiFieldProps}
      >
        <CodeEditor value={value} onChange={setValue} {...(editorProps as any)} />
      </EuiPanel>
    </EuiFormRow>
  );
};
