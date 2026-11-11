/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef } from 'react';
import { ESQLLang, monaco } from '@kbn/code-editor';
import { useDebounceFn } from '@kbn/react-hooks';
import type { ESQLCallbacks } from '@kbn/esql-types';
import { registerEditorMessages, type EditorMessages } from './esql_editor_messages_registry';

const MARKER_OWNER = 'alertingV2SplitQuery';
// Module-level so the object identity is stable across renders — `useDebounceFn`
// re-creates the debounced function whenever its options reference changes.
const DEBOUNCE_OPTIONS = { wait: 256 };

interface UseSplitQueryValidationParams {
  /**
   * The base query that precedes the block. Validation runs against
   * `baseQuery + '\n' + blockText` so the fragment is checked in context, but
   * markers are mapped back to the block editor's own line numbers.
   * Empty string (e.g. the base tab, or no base) validates the block verbatim.
   */
  baseQuery: string;
  callbacks: ESQLCallbacks;
}

/**
 * Registers client-side ES|QL validation markers on a split-query block editor.
 *
 * The block editor shows only the appended fragment (e.g. `| WHERE cpu > 0.8`),
 * but a fragment on its own is not a valid ES|QL query. So validation runs on the
 * composed `base + '\n' + fragment`, then the resulting markers are:
 *   1. filtered to those that fall inside the fragment (line > base line count), and
 *   2. shifted up by the base line count so they land on the block editor's lines.
 *
 * Usage:
 *   const { onEditorMount } = useSplitQueryValidation({ baseQuery, callbacks });
 *   <CodeEditor editorDidMount={onEditorMount} ... />
 */
export function useSplitQueryValidation({ baseQuery, callbacks }: UseSplitQueryValidationParams) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const contentDisposableRef = useRef<monaco.IDisposable | null>(null);
  const messagesDisposableRef = useRef<(() => void) | null>(null);
  // Latest fragment-space messages (with `code` intact) for the code action
  // provider — read from the registry keyed by this editor's model URI.
  const messagesRef = useRef<EditorMessages>({ errors: [], warnings: [] });

  // `useDebounceFn` keeps `run` stable while always invoking the latest closure,
  // so `validate` can read `baseQuery` / `callbacks` directly, and the debounce
  // auto-cancels on unmount.
  const { run: scheduleValidation } = useDebounceFn(async () => {
    const model = editorRef.current?.getModel();
    if (!model || model.isDisposed()) {
      return;
    }

    const baseLineCount = baseQuery ? baseQuery.split('\n').length : 0;
    const blockText = model.getValue();
    const composed = baseQuery ? `${baseQuery}\n${blockText}` : blockText;

    let result: Awaited<ReturnType<typeof ESQLLang.validate>>;
    try {
      result = await ESQLLang.validate(model, composed, callbacks);
    } catch {
      // Validation is best-effort: on failure we leave existing markers untouched.
      return;
    }

    if (model.isDisposed()) {
      return;
    }

    // Keep only messages inside the fragment (not the locked base) and shift their
    // line numbers into the block editor's coordinate space. `code` is kept so the
    // code action provider can look up quick fixes.
    const toFragmentSpace = <T extends monaco.editor.IMarkerData>(message: T): T => ({
      ...message,
      startLineNumber: message.startLineNumber - baseLineCount,
      endLineNumber: message.endLineNumber - baseLineCount,
    });
    const isInsideFragment = (message: monaco.editor.IMarkerData) =>
      message.startLineNumber > baseLineCount;

    const errors = result.errors.filter(isInsideFragment).map(toFragmentSpace);
    const warnings = result.warnings.filter(isInsideFragment).map(toFragmentSpace);
    messagesRef.current = { errors, warnings };

    monaco.editor.setModelMarkers(
      model,
      MARKER_OWNER,
      // Don't surface the raw error code next to the squiggle.
      [...errors, ...warnings].map((marker) => ({ ...marker, code: undefined }))
    );
  }, DEBOUNCE_OPTIONS);

  const onEditorMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      editorRef.current = editor;
      const modelUri = editor.getModel()?.uri.toString();
      if (modelUri) {
        messagesDisposableRef.current = registerEditorMessages(modelUri, () => messagesRef.current);
      }
      contentDisposableRef.current = editor.onDidChangeModelContent(() => scheduleValidation());
      scheduleValidation();
    },
    [scheduleValidation]
  );

  // Re-validate when the base query changes — the fragment's context changed.
  useEffect(() => {
    scheduleValidation();
  }, [baseQuery, scheduleValidation]);

  useEffect(() => {
    return () => {
      contentDisposableRef.current?.dispose();
      messagesDisposableRef.current?.();
      const model = editorRef.current?.getModel();
      if (model && !model.isDisposed()) {
        monaco.editor.setModelMarkers(model, MARKER_OWNER, []);
      }
    };
  }, []);

  return { onEditorMount };
}
