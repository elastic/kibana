/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiScreenReaderOnly, EuiSpacer } from '@elastic/eui';
import { CodeEditor } from '@kbn/code-editor';
import { monaco, XJsonLang } from '@kbn/monaco';

export interface Props {
  licenseEnabled: boolean;
  editorValue: string;
  setEditorValue: (value: string) => void;
  onEditorReady: (props: EditorProps) => void;
}

const EDITOR_INPUT_ID = 'SearchProfilerTextArea';

export interface EditorProps {
  focus: () => void;
}

export const Editor = memo(
  ({ licenseEnabled, editorValue, setEditorValue, onEditorReady }: Props) => {
    const editorDidMountCallback = useCallback(
      (editor: monaco.editor.IStandaloneCodeEditor) => {
        onEditorReady({
          focus: () => {
            editor.focus();
          },
        } as EditorProps);
      },
      [onEditorReady]
    );

    return (
      <>
        <EuiScreenReaderOnly>
          <label htmlFor={EDITOR_INPUT_ID}>
            {i18n.translate('xpack.searchProfiler.editorElementLabel', {
              defaultMessage: 'Dev Tools Search Profiler editor',
            })}
          </label>
        </EuiScreenReaderOnly>

        <EuiSpacer size="m" />
        <CodeEditor
          languageId={XJsonLang.ID}
          dataTestSubj="searchProfilerEditor"
          value={editorValue}
          editorDidMount={editorDidMountCallback}
          options={{
            readOnly: !licenseEnabled,
            lineNumbers: 'on',
            tabSize: 2,
            automaticLayout: true,
            overviewRulerLanes: 0,
          }}
          aria-label={i18n.translate('xpack.searchProfiler.editor.queryEditor', {
            defaultMessage: 'Query editor',
          })}
          onChange={setEditorValue}
        />
        <EuiSpacer size="m" />
      </>
    );
  }
);
