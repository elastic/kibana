/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { ESQLLang, monaco } from '@kbn/code-editor';
import type { ESQLCallbacks } from '@kbn/esql-types';
import { useSplitQueryValidation } from './use_split_query_validation';

jest.mock('@kbn/code-editor', () => ({
  ESQLLang: {
    validate: jest.fn(),
  },
  monaco: {
    editor: {
      setModelMarkers: jest.fn(),
    },
  },
}));

const flushDebounce = async () => {
  jest.advanceTimersByTime(256);
  // Allow the awaited validate() promise chain to settle.
  await Promise.resolve();
  await Promise.resolve();
};

describe('useSplitQueryValidation', () => {
  const callbacks = {} as ESQLCallbacks;
  let contentListener: () => void;
  let model: { getValue: jest.Mock; isDisposed: jest.Mock };
  let editor: { getModel: jest.Mock; onDidChangeModelContent: jest.Mock };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    model = {
      getValue: jest.fn(() => '| WHERE cpu > 0.8'),
      isDisposed: jest.fn(() => false),
    };
    editor = {
      getModel: jest.fn(() => model),
      onDidChangeModelContent: jest.fn((listener: () => void) => {
        contentListener = listener;
        return { dispose: jest.fn() };
      }),
    };

    jest.mocked(ESQLLang.validate).mockResolvedValue({ errors: [], warnings: [] });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('validates the composed base + block and offsets markers to block line numbers', async () => {
    // base spans 2 lines → a marker on line 3 of the composed query is block line 1.
    jest.mocked(ESQLLang.validate).mockResolvedValue({
      errors: [
        {
          message: 'bad',
          startLineNumber: 3,
          endLineNumber: 3,
          startColumn: 1,
          endColumn: 5,
          severity: 8,
          code: 'someCode',
        },
      ],
      warnings: [],
    } as Awaited<ReturnType<typeof ESQLLang.validate>>);

    const { result } = renderHook(() =>
      useSplitQueryValidation({ baseQuery: 'FROM logs-*\n| STATS c = COUNT()', callbacks })
    );

    result.current.onEditorMount(editor as unknown as monaco.editor.IStandaloneCodeEditor);
    await flushDebounce();

    expect(ESQLLang.validate).toHaveBeenCalledWith(
      model,
      'FROM logs-*\n| STATS c = COUNT()\n| WHERE cpu > 0.8',
      callbacks
    );
    const markers = jest.mocked(monaco.editor.setModelMarkers).mock.calls.at(-1)?.[2];
    expect(markers).toEqual([
      expect.objectContaining({ startLineNumber: 1, endLineNumber: 1, code: undefined }),
    ]);
  });

  it('drops markers that fall inside the locked base', async () => {
    jest.mocked(ESQLLang.validate).mockResolvedValue({
      errors: [
        {
          message: 'base error',
          startLineNumber: 1,
          endLineNumber: 1,
          startColumn: 1,
          endColumn: 5,
          severity: 8,
          code: 'baseError',
        },
      ],
      warnings: [],
    } as Awaited<ReturnType<typeof ESQLLang.validate>>);

    const { result } = renderHook(() =>
      useSplitQueryValidation({ baseQuery: 'FROM logs-*\n| STATS c = COUNT()', callbacks })
    );

    result.current.onEditorMount(editor as unknown as monaco.editor.IStandaloneCodeEditor);
    await flushDebounce();

    const markers = jest.mocked(monaco.editor.setModelMarkers).mock.calls.at(-1)?.[2];
    expect(markers).toEqual([]);
  });

  it('validates the block verbatim when there is no base query', async () => {
    const { result } = renderHook(() => useSplitQueryValidation({ baseQuery: '', callbacks }));

    result.current.onEditorMount(editor as unknown as monaco.editor.IStandaloneCodeEditor);
    await flushDebounce();

    expect(ESQLLang.validate).toHaveBeenCalledWith(model, '| WHERE cpu > 0.8', callbacks);
  });

  it('re-validates when the editor content changes', async () => {
    const { result } = renderHook(() =>
      useSplitQueryValidation({ baseQuery: 'FROM logs-*', callbacks })
    );

    result.current.onEditorMount(editor as unknown as monaco.editor.IStandaloneCodeEditor);
    await flushDebounce();
    const initialCalls = jest.mocked(ESQLLang.validate).mock.calls.length;

    contentListener();
    await flushDebounce();

    expect(jest.mocked(ESQLLang.validate).mock.calls.length).toBeGreaterThan(initialCalls);
  });
});
