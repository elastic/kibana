/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef } from 'react';
import { suggest } from '@kbn/esql-language';
import { getEsqlColumns } from '@kbn/esql-utils';
import { ESQL_LANG_ID, monaco } from '@kbn/code-editor';
import type { ESQLCallbacks } from '@kbn/esql-types';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';

interface UseSplitQueryCompletionParams {
  /**
   * The base query whose output columns provide the autocomplete context.
   * e.g. "FROM logs-* | STATS cpu = AVG(cpu) BY host.name"
   * The block editor shows only the appended fragment (e.g. "| WHERE cpu > 0.8"),
   * but autocomplete needs to see both.
   */
  baseQuery: string;
  search: DataPublicPluginStart['search']['search'];
}

/**
 * Registers a per-editor Monaco completion provider that understands split ES|QL queries.
 *
 * Technique: at suggestion time, prepend `baseQuery + ' '` to the editor's text to form
 * a syntactically complete ES|QL query, adjust the cursor offset, and call `suggest()`.
 * This makes column names from the base query available for autocomplete in the block editor.
 *
 * Usage:
 *   const { onEditorMount } = useSplitQueryCompletion({ baseQuery, search });
 *   <CodeEditor editorDidMount={onEditorMount} ... />
 *
 * Swap strategy: replace this hook with a different implementation if ES|QL ever adds a
 * native "query context" parameter to its autocomplete API.
 */
export function useSplitQueryCompletion({ baseQuery, search }: UseSplitQueryCompletionParams) {
  // Assign refs directly during render — no useEffect needed. Refs are mutable
  // and reading/writing them during render is safe. Using useEffect here would
  // add two unnecessary effect invocations per render with no benefit.
  const baseQueryRef = useRef(baseQuery);
  const searchRef = useRef(search);
  baseQueryRef.current = baseQuery;
  searchRef.current = search;

  // Store the disposable for cleanup on unmount.
  const disposableRef = useRef<monaco.IDisposable | null>(null);

  const onEditorMount = useCallback((editor: monaco.editor.IStandaloneCodeEditor) => {
    const callbacks: ESQLCallbacks = {
      getColumnsFor: async (ctx) =>
        getEsqlColumns({ esqlQuery: ctx?.query ?? '', search: searchRef.current }),
    };

    disposableRef.current = monaco.languages.registerCompletionItemProvider(ESQL_LANG_ID, {
      triggerCharacters: [' ', ',', '.', '|', '('],

      async provideCompletionItems(model, position) {
        // Guard: only handle the specific editor this hook was mounted on.
        if (model.id !== editor.getModel()?.id) return { suggestions: [] };

        const currentBaseQuery = baseQueryRef.current;
        if (!currentBaseQuery.trim()) return { suggestions: [] };

        const editorText = model.getValue();
        const fullQuery = `${currentBaseQuery} ${editorText}`;
        const editorOffset = model.getOffsetAt(position);
        // Offset into the full query = base length + 1 (for the space) + editor offset
        const fullQueryOffset = currentBaseQuery.length + 1 + editorOffset;

        let rawSuggestions: Awaited<ReturnType<typeof suggest>>;
        try {
          rawSuggestions = await suggest(fullQuery, fullQueryOffset, callbacks);
        } catch {
          // Monaco already swallows unhandled rejections from provideCompletionItems,
          // but wrapping here prevents unhandled promise rejection warnings and makes
          // the degradation explicit: autocomplete silently returns nothing on failure.
          return { suggestions: [] };
        }

        // Use word range at cursor — simpler than full range computation and works well
        // for field names, functions, and keywords which are the main autocomplete targets.
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        return {
          suggestions: rawSuggestions.map((s) => ({
            label: s.label,
            insertText: s.text,
            insertTextRules: s.asSnippet
              ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              : undefined,
            kind: Object.prototype.hasOwnProperty.call(monaco.languages.CompletionItemKind, s.kind)
              ? monaco.languages.CompletionItemKind[
                  s.kind as keyof typeof monaco.languages.CompletionItemKind
                ]
              : monaco.languages.CompletionItemKind.Field,
            detail: s.detail,
            sortText: s.sortText,
            filterText: s.filterText,
            range,
          })),
        };
      },
    });
  }, []); // stable — reads baseQuery and search via refs

  // Clean up the provider when the component using this hook unmounts.
  useEffect(() => {
    return () => {
      disposableRef.current?.dispose();
      disposableRef.current = null;
    };
  }, []);

  return { onEditorMount };
}
