/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook } from '@testing-library/react';
import { ESQLLang, ESQL_LANG_ID, monaco } from '@kbn/code-editor';
import { createMockServices } from '../../test_utils';
import { useEsqlCallbacks } from '../../form/hooks/use_esql_callbacks';
import { useEsqlAutocomplete } from './use_esql_providers';

const mockDisposeSuggestion = vi.fn();
const mockDisposeSignature = vi.fn();
const mockDisposeHover = vi.fn();
const mockDisposeInlineCompletions = vi.fn();
const mockDisposeCodeActions = vi.fn();
const mockDisposeDocumentHighlight = vi.fn();

vi.mock('@kbn/code-editor', () => {
  const mocked = {
    ESQL_LANG_ID: 'esql',
    ESQLLang: {
      getSuggestionProvider: vi.fn(),
      getSignatureProvider: vi.fn(),
      getHoverProvider: vi.fn(),
      getInlineCompletionsProvider: vi.fn(),
      getCodeActionProvider: vi.fn(),
      getDocumentHighlightProvider: vi.fn(),
    },
    monaco: {
      languages: {
        registerCompletionItemProvider: vi.fn(),
        registerSignatureHelpProvider: vi.fn(),
        registerHoverProvider: vi.fn(),
        registerInlineCompletionsProvider: vi.fn(),
        registerCodeActionProvider: vi.fn(),
        registerDocumentHighlightProvider: vi.fn(),
      },
      editor: {
        addKeybindingRule: vi.fn(),
      },
      KeyCode: { Tab: 2 },
    },
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../form/hooks/use_esql_callbacks', () => {
  const mocked = {
    useEsqlCallbacks: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

describe('useEsqlAutocomplete', () => {
  const services = createMockServices();
  const getSources = vi.fn();
  const getColumnsFor = vi.fn();
  const suggestionProvider = { provideCompletionItems: vi.fn() };
  const signatureProvider: monaco.languages.SignatureHelpProvider = {
    signatureHelpTriggerCharacters: ['('],
    provideSignatureHelp: vi.fn(() => ({
      value: {
        signatures: [],
        activeSignature: 0,
        activeParameter: 0,
      },
      dispose: vi.fn(),
    })),
  };
  const hoverProvider = { provideHover: vi.fn() };
  const inlineCompletionsProvider = {
    provideInlineCompletions: vi.fn(),
    freeInlineCompletions: vi.fn(),
  };
  const codeActionProvider = { provideCodeActions: vi.fn() };
  const documentHighlightProvider = { provideDocumentHighlights: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(monaco.languages.registerCompletionItemProvider).mockReturnValue({
      dispose: mockDisposeSuggestion,
    });
    vi.mocked(monaco.languages.registerSignatureHelpProvider).mockReturnValue({
      dispose: mockDisposeSignature,
    });
    vi.mocked(monaco.languages.registerHoverProvider).mockReturnValue({
      dispose: mockDisposeHover,
    });
    vi.mocked(monaco.languages.registerInlineCompletionsProvider).mockReturnValue({
      dispose: mockDisposeInlineCompletions,
    });
    vi.mocked(monaco.languages.registerCodeActionProvider).mockReturnValue({
      dispose: mockDisposeCodeActions,
    });
    vi.mocked(monaco.languages.registerDocumentHighlightProvider).mockReturnValue({
      dispose: mockDisposeDocumentHighlight,
    });
    vi.mocked(ESQLLang.getSuggestionProvider).mockReturnValue(suggestionProvider);
    vi.mocked(ESQLLang.getSignatureProvider!).mockReturnValue(signatureProvider);
    vi.mocked(ESQLLang.getHoverProvider!).mockReturnValue(hoverProvider);
    vi.mocked(ESQLLang.getInlineCompletionsProvider!).mockReturnValue(inlineCompletionsProvider);
    vi.mocked(ESQLLang.getCodeActionProvider!).mockReturnValue(codeActionProvider);
    vi.mocked(ESQLLang.getDocumentHighlightProvider!).mockReturnValue(documentHighlightProvider);
    vi.mocked(useEsqlCallbacks).mockReturnValue({ getSources, getColumnsFor });
  });

  it('registers ES|QL autocomplete, signature help, and hover providers', () => {
    renderHook(() => useEsqlAutocomplete(services));

    expect(ESQLLang.getSuggestionProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        getSources: expect.any(Function),
        getColumnsFor: expect.any(Function),
      })
    );
    expect(monaco.languages.registerCompletionItemProvider).toHaveBeenCalledWith(
      ESQL_LANG_ID,
      suggestionProvider
    );
    expect(monaco.languages.registerSignatureHelpProvider).toHaveBeenCalledWith(
      ESQL_LANG_ID,
      signatureProvider
    );
    expect(monaco.languages.registerHoverProvider).toHaveBeenCalledWith(
      ESQL_LANG_ID,
      hoverProvider
    );

    // Tab keybindings are added once via a module-level guard, so this is asserted
    // in the first rendering test — later renders in this file don't call it again.
    expect(monaco.editor.addKeybindingRule).toHaveBeenCalledWith(
      expect.objectContaining({ command: '-acceptSelectedSuggestion' })
    );
    expect(monaco.editor.addKeybindingRule).toHaveBeenCalledWith(
      expect.objectContaining({ command: 'editor.action.inlineSuggest.commit' })
    );
  });

  it('registers ES|QL inline completions, code actions, and document highlight providers', () => {
    renderHook(() => useEsqlAutocomplete(services));

    expect(monaco.languages.registerInlineCompletionsProvider).toHaveBeenCalledWith(
      ESQL_LANG_ID,
      inlineCompletionsProvider
    );
    expect(monaco.languages.registerCodeActionProvider).toHaveBeenCalledWith(
      ESQL_LANG_ID,
      codeActionProvider
    );
    expect(monaco.languages.registerDocumentHighlightProvider).toHaveBeenCalledWith(
      ESQL_LANG_ID,
      documentHighlightProvider
    );
  });

  it('disposes registered providers on unmount', () => {
    const { unmount } = renderHook(() => useEsqlAutocomplete(services));

    unmount();

    expect(mockDisposeSuggestion).toHaveBeenCalledTimes(1);
    expect(mockDisposeSignature).toHaveBeenCalledTimes(1);
    expect(mockDisposeHover).toHaveBeenCalledTimes(1);
    expect(mockDisposeInlineCompletions).toHaveBeenCalledTimes(1);
    expect(mockDisposeCodeActions).toHaveBeenCalledTimes(1);
    expect(mockDisposeDocumentHighlight).toHaveBeenCalledTimes(1);
  });
});
