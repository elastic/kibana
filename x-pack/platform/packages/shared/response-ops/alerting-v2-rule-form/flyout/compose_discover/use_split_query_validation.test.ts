/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook } from '@testing-library/react';
import { ESQLLang, monaco } from '@kbn/code-editor';
import type { ESQLCallbacks } from '@kbn/esql-types';
import { useSplitQueryValidation } from './use_split_query_validation';
import { getModelDependencies } from './esql_editor_messages_registry';

vi.mock('@kbn/code-editor', () => {
      const mocked = {
      ESQLLang: {
        validate: vi.fn(),
      },
      monaco: {
        editor: {
          setModelMarkers: vi.fn(),
        },
      },
    };
      return { ...mocked, default: mocked };
    });

const flushDebounce = async () => {
  vi.advanceTimersByTime(256);
  // Allow the awaited validate() promise chain to settle.
  await Promise.resolve();
  await Promise.resolve();
};

describe('useSplitQueryValidation', () => {
  const callbacks = {} as ESQLCallbacks;
  let contentListener: () => void;
  let model: { getValue: Mock; isDisposed: Mock; uri: { toString: () => string } };
  let editor: { getModel: Mock; onDidChangeModelContent: Mock };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    model = {
      getValue: vi.fn(() => '| WHERE cpu > 0.8'),
      isDisposed: vi.fn(() => false),
      uri: { toString: () => 'model-uri-1' },
    };
    editor = {
      getModel: vi.fn(() => model),
      onDidChangeModelContent: vi.fn((listener: () => void) => {
        contentListener = listener;
        return { dispose: vi.fn() };
      }),
    };

    vi.mocked(ESQLLang.validate).mockResolvedValue({ errors: [], warnings: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('validates the composed base + block and offsets markers to block line numbers', async () => {
    // base spans 2 lines → a marker on line 3 of the composed query is block line 1.
    vi.mocked(ESQLLang.validate).mockResolvedValue({
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
    const markers = vi.mocked(monaco.editor.setModelMarkers).mock.calls.at(-1)?.[2];
    expect(markers).toEqual([
      expect.objectContaining({ startLineNumber: 1, endLineNumber: 1, code: undefined }),
    ]);
  });

  it('publishes fragment-space messages (with code) to the registry for code actions', async () => {
    vi.mocked(ESQLLang.validate).mockResolvedValue({
      errors: [
        {
          message: 'bad',
          startLineNumber: 3,
          endLineNumber: 3,
          startColumn: 1,
          endColumn: 5,
          severity: 8,
          code: 'invalidUnquotedIdentifier',
        },
      ],
      warnings: [],
    } as Awaited<ReturnType<typeof ESQLLang.validate>>);

    const { result } = renderHook(() =>
      useSplitQueryValidation({ baseQuery: 'FROM logs-*\n| STATS c = COUNT()', callbacks })
    );

    result.current.onEditorMount(editor as unknown as monaco.editor.IStandaloneCodeEditor);
    await flushDebounce();

    const deps = getModelDependencies(model as unknown as monaco.editor.ITextModel);
    expect(deps?.getEditorMessages?.()).toEqual({
      errors: [
        expect.objectContaining({
          startLineNumber: 1,
          endLineNumber: 1,
          // code is kept on messages (unlike markers) so quick fixes can be resolved.
          code: 'invalidUnquotedIdentifier',
        }),
      ],
      warnings: [],
    });
  });

  it('unregisters its messages from the registry on unmount', async () => {
    const { result, unmount } = renderHook(() =>
      useSplitQueryValidation({ baseQuery: '', callbacks })
    );

    result.current.onEditorMount(editor as unknown as monaco.editor.IStandaloneCodeEditor);
    await flushDebounce();
    expect(getModelDependencies(model as unknown as monaco.editor.ITextModel)).toBeDefined();

    unmount();
    expect(getModelDependencies(model as unknown as monaco.editor.ITextModel)).toBeUndefined();
  });

  it('drops markers that fall inside the locked base', async () => {
    vi.mocked(ESQLLang.validate).mockResolvedValue({
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

    const markers = vi.mocked(monaco.editor.setModelMarkers).mock.calls.at(-1)?.[2];
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
    const initialCalls = vi.mocked(ESQLLang.validate).mock.calls.length;

    contentListener();
    await flushDebounce();

    expect(vi.mocked(ESQLLang.validate).mock.calls.length).toBeGreaterThan(initialCalls);
  });
});
