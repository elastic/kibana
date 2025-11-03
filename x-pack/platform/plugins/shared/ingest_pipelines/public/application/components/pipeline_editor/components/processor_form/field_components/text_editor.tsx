/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React from 'react';
import { css } from '@emotion/react';

import { EuiFormRow } from '@elastic/eui';
import type { FieldHook } from '../../../../../../shared_imports';
import { CodeEditor, getFieldValidityAndErrorMessage } from '../../../../../../shared_imports';

interface Props {
  field: FieldHook<string>;
  editorProps: { [key: string]: any };
  euiFieldProps?: Record<string, any>;
}

const styles = {
  panel: css`
    box-shadow: none;
  `,
};

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
      <EuiPanel paddingSize="s" hasShadow={false} {...euiFieldProps} css={styles.panel}>
        <CodeEditor value={value} onChange={setValue} {...(editorProps as any)} />
      </EuiPanel>
    </EuiFormRow>
  );
};
