/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { ESQLLang, ESQL_LANG_ID, monaco } from '@kbn/code-editor';
import { createMockServices } from '../../test_utils';
import { useEsqlCallbacks } from '../../form/hooks/use_esql_callbacks';
import { useEsqlAutocomplete } from './use_esql_providers';

const mockDisposeSuggestion = jest.fn();
const mockDisposeSignature = jest.fn();
const mockDisposeHover = jest.fn();
const mockDisposeInlineCompletions = jest.fn();
const mockDisposeCodeActions = jest.fn();
const mockDisposeDocumentHighlight = jest.fn();

jest.mock('@kbn/code-editor', () => ({
  ESQL_LANG_ID: 'esql',
  ESQLLang: {
    getSuggestionProvider: jest.fn(),
    getSignatureProvider: jest.fn(),
    getHoverProvider: jest.fn(),
    getInlineCompletionsProvider: jest.fn(),
    getCodeActionProvider: jest.fn(),
    getDocumentHighlightProvider: jest.fn(),
  },
  monaco: {
    languages: {
      registerCompletionItemProvider: jest.fn(),
      registerSignatureHelpProvider: jest.fn(),
      registerHoverProvider: jest.fn(),
      registerInlineCompletionsProvider: jest.fn(),
      registerCodeActionProvider: jest.fn(),
      registerDocumentHighlightProvider: jest.fn(),
    },
    editor: {
      addKeybindingRule: jest.fn(),
    },
    KeyCode: { Tab: 2 },
  },
}));

jest.mock('../../form/hooks/use_esql_callbacks', () => ({
  useEsqlCallbacks: jest.fn(),
}));

describe('useEsqlAutocomplete', () => {
  const services = createMockServices();
  const getSources = jest.fn();
  const getColumnsFor = jest.fn();
  const suggestionProvider = { provideCompletionItems: jest.fn() };
  const signatureProvider: monaco.languages.SignatureHelpProvider = {
    signatureHelpTriggerCharacters: ['('],
    provideSignatureHelp: jest.fn(() => ({
      value: {
        signatures: [],
        activeSignature: 0,
        activeParameter: 0,
      },
      dispose: jest.fn(),
    })),
  };
  const hoverProvider = { provideHover: jest.fn() };
  const inlineCompletionsProvider = {
    provideInlineCompletions: jest.fn(),
    freeInlineCompletions: jest.fn(),
  };
  const codeActionProvider = { provideCodeActions: jest.fn() };
  const documentHighlightProvider = { provideDocumentHighlights: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(monaco.languages.registerCompletionItemProvider)
      .mockReturnValue({ dispose: mockDisposeSuggestion });
    jest
      .mocked(monaco.languages.registerSignatureHelpProvider)
      .mockReturnValue({ dispose: mockDisposeSignature });
    jest
      .mocked(monaco.languages.registerHoverProvider)
      .mockReturnValue({ dispose: mockDisposeHover });
    jest
      .mocked(monaco.languages.registerInlineCompletionsProvider)
      .mockReturnValue({ dispose: mockDisposeInlineCompletions });
    jest
      .mocked(monaco.languages.registerCodeActionProvider)
      .mockReturnValue({ dispose: mockDisposeCodeActions });
    jest
      .mocked(monaco.languages.registerDocumentHighlightProvider)
      .mockReturnValue({ dispose: mockDisposeDocumentHighlight });
    jest.mocked(ESQLLang.getSuggestionProvider).mockReturnValue(suggestionProvider);
    jest.mocked(ESQLLang.getSignatureProvider!).mockReturnValue(signatureProvider);
    jest.mocked(ESQLLang.getHoverProvider!).mockReturnValue(hoverProvider);
    jest.mocked(ESQLLang.getInlineCompletionsProvider!).mockReturnValue(inlineCompletionsProvider);
    jest.mocked(ESQLLang.getCodeActionProvider!).mockReturnValue(codeActionProvider);
    jest.mocked(ESQLLang.getDocumentHighlightProvider!).mockReturnValue(documentHighlightProvider);
    jest.mocked(useEsqlCallbacks).mockReturnValue({ getSources, getColumnsFor });
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
