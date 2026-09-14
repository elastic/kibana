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

    const markers = [...result.errors, ...result.warnings]
      // Keep only markers that fall inside the fragment, not the locked base.
      .filter((marker) => marker.startLineNumber > baseLineCount)
      .map((marker) => ({
        ...marker,
        startLineNumber: marker.startLineNumber - baseLineCount,
        endLineNumber: marker.endLineNumber - baseLineCount,
        // Don't surface the raw error code in the editor.
        code: undefined,
      }));

    monaco.editor.setModelMarkers(model, MARKER_OWNER, markers);
  }, DEBOUNCE_OPTIONS);

  const onEditorMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      editorRef.current = editor;
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
      const model = editorRef.current?.getModel();
      if (model && !model.isDisposed()) {
        monaco.editor.setModelMarkers(model, MARKER_OWNER, []);
      }
    };
  }, []);

  return { onEditorMount };
}
