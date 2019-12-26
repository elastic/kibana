/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { EuiFormRow, EuiCodeEditor } from '@elastic/eui';
import { debounce } from 'lodash';

import { useJson, OnUpdateHandler } from './use_json';

interface Props {
  onUpdate: OnUpdateHandler;
  label?: string;
  helpText?: React.ReactNode;
  defaultValue?: { [key: string]: any };
  euiCodeEditorProps?: { [key: string]: any };
}

export const JsonEditor = React.memo(
  ({ label, helpText, onUpdate, defaultValue, euiCodeEditorProps }: Props) => {
    const { content, setContent, error } = useJson({
      defaultValue,
      onUpdate,
    });

    const debouncedSetContent = useCallback(debounce(setContent, 300), [setContent]);

    return (
      <EuiFormRow
        label={label}
        helpText={helpText}
        isInvalid={Boolean(error)}
        error={error}
        fullWidth
      >
        <EuiCodeEditor
          mode="json"
          theme="textmate"
          width="100%"
          height="500px"
          setOptions={{
            showLineNumbers: false,
            tabSize: 2,
          }}
          editorProps={{
            $blockScrolling: Infinity,
          }}
          showGutter={false}
          minLines={6}
          value={content}
          onChange={(updated: string) => {
            debouncedSetContent(updated);
          }}
          {...euiCodeEditorProps}
        />
      </EuiFormRow>
    );
  }
);
