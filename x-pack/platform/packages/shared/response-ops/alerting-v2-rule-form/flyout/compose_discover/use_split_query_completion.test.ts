/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { suggest } from '@kbn/esql-language';
import { getEsqlColumns } from '@kbn/esql-utils';
import { ESQL_LANG_ID, monaco } from '@kbn/code-editor';
import { useSplitQueryCompletion } from './use_split_query_completion';

const mockDispose = jest.fn();

jest.mock('@kbn/code-editor', () => ({
  ESQL_LANG_ID: 'esql',
  monaco: {
    languages: {
      CompletionItemInsertTextRule: {
        InsertAsSnippet: 4,
      },
      CompletionItemKind: {
        Field: 5,
      },
      registerCompletionItemProvider: jest.fn(),
    },
  },
}));

jest.mock('@kbn/esql-language', () => ({
  suggest: jest.fn(),
}));

jest.mock('@kbn/esql-utils', () => ({
  getEsqlColumns: jest.fn(),
}));

describe('useSplitQueryCompletion', () => {
  const baseQuery = 'FROM logs-*\n| STATS count = COUNT(*) BY host.name';
  const search = jest.fn();
  const editor = {
    getModel: () => ({ id: 'editor-model' }),
  } as unknown as monaco.editor.IStandaloneCodeEditor;
  const model = {
    id: 'editor-model',
    getValue: () => '| WHERE co',
    getOffsetAt: jest.fn((_position: monaco.Position) => 10),
    getWordUntilPosition: jest.fn((_position: monaco.Position) => ({
      startColumn: 9,
      endColumn: 11,
    })),
  };
  const position = { lineNumber: 1, column: 11 } as monaco.Position;
  const getCompletionItems = (provider: monaco.languages.CompletionItemProvider) =>
    provider.provideCompletionItems(
      model as unknown as monaco.editor.ITextModel,
      position,
      {} as monaco.languages.CompletionContext,
      {} as monaco.CancellationToken
    );

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(monaco.languages.registerCompletionItemProvider)
      .mockReturnValue({ dispose: mockDispose });
    jest.mocked(suggest).mockResolvedValue([
      {
        label: 'count',
        text: 'count',
        kind: 'Field',
        detail: 'number',
        sortText: '1',
        filterText: 'count',
      },
    ]);
  });

  const mountProvider = (query = baseQuery) => {
    const hook = renderHook(() => useSplitQueryCompletion({ baseQuery: query, search }));
    act(() => {
      hook.result.current.onEditorMount(editor);
    });
    return {
      ...hook,
      provider: jest.mocked(monaco.languages.registerCompletionItemProvider).mock.calls[0][1],
    };
  };

  it('registers a completion provider for ES|QL', () => {
    mountProvider();

    expect(monaco.languages.registerCompletionItemProvider).toHaveBeenCalledWith(
      ESQL_LANG_ID,
      expect.objectContaining({
        triggerCharacters: [' ', ',', '.', '|', '('],
        provideCompletionItems: expect.any(Function),
      })
    );
  });

  it('prepends the base query when requesting suggestions for a split query block', async () => {
    const { provider } = mountProvider();

    const result = await getCompletionItems(provider);

    expect(suggest).toHaveBeenCalledWith(
      `${baseQuery} ${model.getValue()}`,
      baseQuery.length + 1 + model.getOffsetAt(position),
      expect.objectContaining({
        getColumnsFor: expect.any(Function),
      })
    );
    expect(result?.suggestions).toEqual([
      expect.objectContaining({
        label: 'count',
        insertText: 'count',
        kind: monaco.languages.CompletionItemKind.Field,
        range: {
          startLineNumber: 1,
          endLineNumber: 1,
          startColumn: 9,
          endColumn: 11,
        },
      }),
    ]);
  });

  it('uses getEsqlColumns with the full query supplied by ES|QL suggest callbacks', async () => {
    const columns = [{ name: 'count', type: 'long', userDefined: false as const }];
    jest.mocked(getEsqlColumns).mockResolvedValue(columns);
    const { provider } = mountProvider();

    await getCompletionItems(provider);
    const callbacks = jest.mocked(suggest).mock.calls[0][2]!;
    const result = await callbacks.getColumnsFor?.({ query: `${baseQuery} | WHERE co` });

    expect(getEsqlColumns).toHaveBeenCalledWith({
      esqlQuery: `${baseQuery} | WHERE co`,
      search,
    });
    expect(result).toEqual(columns);
  });

  it('returns no suggestions when there is no base query context', async () => {
    const { provider } = mountProvider(' ');

    const result = await getCompletionItems(provider);

    expect(result).toEqual({ suggestions: [] });
    expect(suggest).not.toHaveBeenCalled();
  });

  it('disposes the provider on hook unmount', () => {
    const { unmount } = mountProvider();

    unmount();

    expect(mockDispose).toHaveBeenCalledTimes(1);
  });
});
