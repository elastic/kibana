/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CodeEditor } from '@kbn/code-editor';
import type { monaco as codeEditorMonaco } from '@kbn/code-editor';
import { monaco } from '@kbn/monaco';
import type { PublicTriggerDefinition } from '@kbn/workflows-extensions/public';
import { workflowsEditorChromeOverrides } from '@kbn/workflows-ui';
import { SINGLE_LINE_EDITOR_OPTIONS } from './reference_text_input';
import { useKibana } from '../../../hooks/use_kibana';
import { getKqlSuggestionsForEventSchema } from '../../../widgets/workflow_yaml_editor/lib/autocomplete/suggestions/trigger_condition/get_trigger_condition_kql_suggestions';

type Editor = codeEditorMonaco.editor.IStandaloneCodeEditor;

/** Plain text with no highlighting: its only purpose is to own the KQL completion provider. */
const KQL_CONDITION_LANG_ID = 'workflows-trigger-condition-kql';

const ensureKqlConditionLanguage = (): void => {
  if (monaco.languages.getLanguages().some(({ id }) => id === KQL_CONDITION_LANG_ID)) return;
  monaco.languages.register({ id: KQL_CONDITION_LANG_ID });
};

export interface KqlConditionInputProps {
  readonly value: string;
  readonly onChange: (next: string) => void;
  /** The trigger's event: its fields and values are what the suggestions offer. */
  readonly eventSchema: PublicTriggerDefinition['eventSchema'] | undefined;
  readonly ariaLabel: string;
  readonly placeholder?: string;
  readonly isInvalid?: boolean;
  readonly readOnly?: boolean;
  readonly onBlur?: () => void;
  readonly testSubj: string;
}

/** A few lines tall to start with: a condition is often long. The box can be resized from its corner. */
const MIN_BOX_HEIGHT_PX = 72;

/**
 * A KQL box that suggests the fields and values of a trigger's event, as the KQL bar does. It wraps
 * long conditions, takes line breaks, and can be resized.
 */
export function KqlConditionInput({
  value,
  onChange,
  eventSchema,
  ariaLabel,
  placeholder,
  isInvalid = false,
  readOnly = false,
  onBlur,
  testSubj,
}: KqlConditionInputProps) {
  const { euiTheme } = useEuiTheme();
  const { services } = useKibana();
  const { kql, fieldFormats } = services;
  const editorRef = useRef<Editor | null>(null);
  const onBlurRef = useRef(onBlur);
  onBlurRef.current = onBlur;
  ensureKqlConditionLanguage();

  // The provider belongs to the language, not to an editor: it answers for this editor's model only.
  useEffect(() => {
    if (!eventSchema || !kql || !fieldFormats) return;
    const provider = monaco.languages.registerCompletionItemProvider(KQL_CONDITION_LANG_ID, {
      triggerCharacters: [' ', ':', '(', '"', '.'],
      provideCompletionItems: async (model, position) => {
        if (model !== editorRef.current?.getModel()) return { suggestions: [] };
        const suggestions = await getKqlSuggestionsForEventSchema({
          kql: model.getValue(),
          caretInKql: model.getOffsetAt(position),
          contentStartInModel: 0,
          model,
          eventSchema,
          services: { kql, fieldFormats },
        });
        return { suggestions };
      },
    });
    return () => provider.dispose();
  }, [eventSchema, kql, fieldFormats]);

  const handleEditorMount = useCallback((mounted: Editor) => {
    editorRef.current = mounted;
    mounted.onDidBlurEditorText(() => onBlurRef.current?.());
  }, []);

  // The editor follows the box as it is resized.
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [editorHeight, setEditorHeight] = useState(MIN_BOX_HEIGHT_PX);
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell || typeof ResizeObserver === 'undefined') return;
    const syncHeight = () =>
      setEditorHeight(Math.max(MIN_BOX_HEIGHT_PX, Math.floor(shell.clientHeight)));
    syncHeight();
    const observer = new ResizeObserver(syncHeight);
    observer.observe(shell);
    return () => observer.disconnect();
  }, []);
  const paddingPx = parseInt(String(euiTheme.size.s), 10) || 8;

  return (
    <div
      ref={shellRef}
      css={{
        boxSizing: 'border-box',
        inlineSize: '100%',
        blockSize: MIN_BOX_HEIGHT_PX,
        minBlockSize: MIN_BOX_HEIGHT_PX,
        resize: 'vertical',
        overflow: 'hidden',
        borderRadius: euiTheme.border.radius.small,
        border: `${euiTheme.border.width.thin} solid ${
          isInvalid ? euiTheme.colors.borderStrongDanger : euiTheme.colors.borderBasePlain
        }`,
        backgroundColor: euiTheme.colors.backgroundBasePlain,
        paddingInlineStart: euiTheme.size.s,
        '&:focus-within': { borderColor: euiTheme.colors.borderStrongPrimary },
      }}
      data-test-subj={`${testSubj}-box`}
    >
      <CodeEditor
        languageId={KQL_CONDITION_LANG_ID}
        chromeOverrides={workflowsEditorChromeOverrides}
        // Transparent so the box (border, background) shows through.
        transparentBackground
        value={value}
        onChange={onChange}
        height={editorHeight}
        aria-label={ariaLabel}
        placeholder={value.length === 0 ? placeholder : undefined}
        dataTestSubj={testSubj}
        editorDidMount={handleEditorMount}
        options={{
          ...SINGLE_LINE_EDITOR_OPTIONS,
          readOnly,
          wordWrap: 'on',
          padding: { top: paddingPx, bottom: paddingPx },
          scrollbar: { vertical: 'auto', horizontal: 'hidden', alwaysConsumeMouseWheel: false },
          // As you type, as the KQL bar does, and not clipped by the panel.
          quickSuggestions: { other: true, comments: false, strings: true },
          suggestOnTriggerCharacters: true,
          wordBasedSuggestions: 'off',
          fixedOverflowWidgets: true,
        }}
      />
    </div>
  );
}
