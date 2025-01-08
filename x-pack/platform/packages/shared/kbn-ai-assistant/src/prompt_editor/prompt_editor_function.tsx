/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import usePrevious from 'react-use/lib/usePrevious';
import { css } from '@emotion/css';
import { CodeEditor } from '@kbn/code-editor';
import { monaco } from '@kbn/monaco';
import { i18n } from '@kbn/i18n';
import { EuiCode, EuiPanel } from '@elastic/eui';
import { MessageRole } from '@kbn/observability-ai-assistant-plugin/public';
import type { Message } from '@kbn/observability-ai-assistant-plugin/common';
import { useJsonEditorModel } from '../hooks/use_json_editor_model';

export interface Props {
  functionName: string;
  functionPayload?: string;
  onChange: (message: Message['message']) => void;
  onFocus: () => void;
  onBlur: () => void;
}

const functionNameClassName = css`
  display: inline-block;
`;

export function PromptEditorFunction({
  functionName,
  functionPayload,
  onChange,
  onFocus,
  onBlur,
}: Props) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [functionEditorLineCount, setFunctionEditorLineCount] = useState<number>(0);

  const previousPayload = usePrevious(functionPayload);

  const { model, initialJsonString } = useJsonEditorModel({
    functionName,
    initialJson: functionPayload,
  });

  const handleChangePayload = (args: string) => {
    recalculateLineCount();

    onChange({
      role: MessageRole.Assistant,
      content: '',
      function_call: {
        name: functionName,
        trigger: MessageRole.User,
        arguments: args,
      },
    });
  };

  const recalculateLineCount = useCallback(() => {
    const newLineCount = model?.getLineCount() || 0;
    if (newLineCount !== functionEditorLineCount) {
      setFunctionEditorLineCount(newLineCount + 1);
    }
  }, [functionEditorLineCount, model]);

  useEffect(() => {
    recalculateLineCount();
  }, [model, recalculateLineCount]);

  useEffect(() => {
    if (previousPayload === undefined && initialJsonString) {
      onChange({
        role: MessageRole.Assistant,
        content: '',
        function_call: {
          name: functionName,
          trigger: MessageRole.User,
          arguments: initialJsonString,
        },
      });
    }
  }, [functionName, functionPayload, initialJsonString, onChange, previousPayload]);

  editorRef.current?.onDidBlurEditorWidget(() => {
    onBlur();
  });

  return (
    <EuiPanel paddingSize="none" hasShadow={false} hasBorder>
      <EuiCode className={functionNameClassName}>{functionName}</EuiCode>
      <CodeEditor
        aria-label={i18n.translate(
          'xpack.aiAssistant.chatPromptEditor.codeEditor.payloadEditorLabel',
          { defaultMessage: 'payloadEditor' }
        )}
        data-test-subj="observabilityAiAssistantChatPromptEditorCodeEditor"
        editorDidMount={(editor) => {
          editorRef.current = editor;
          editor.focus();
          onFocus();
        }}
        fullWidth
        height={'180px'}
        isCopyable
        languageId="json"
        languageConfiguration={{
          autoClosingPairs: [
            {
              open: '{',
              close: '}',
            },
          ],
        }}
        options={{
          accessibilitySupport: 'off',
          acceptSuggestionOnEnter: 'on',
          automaticLayout: true,
          autoClosingQuotes: 'always',
          autoIndent: 'full',
          contextmenu: true,
          fontSize: 12,
          formatOnPaste: true,
          formatOnType: true,
          inlayHints: { enabled: 'on' },
          lineNumbers: 'on',
          minimap: { enabled: false },
          model,
          overviewRulerBorder: false,
          quickSuggestions: true,
          scrollbar: { alwaysConsumeMouseWheel: false },
          scrollBeyondLastLine: false,
          suggestOnTriggerCharacters: true,
          tabSize: 2,
          wordWrap: 'on',
          wrappingIndent: 'indent',
        }}
        transparentBackground
        value={functionPayload || ''}
        onChange={handleChangePayload}
      />
    </EuiPanel>
  );
}
