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

jest.mock('@kbn/code-editor', () => ({
  ESQL_LANG_ID: 'esql',
  ESQLLang: {
    getSuggestionProvider: jest.fn(),
    getSignatureProvider: jest.fn(),
    getHoverProvider: jest.fn(),
  },
  monaco: {
    languages: {
      registerCompletionItemProvider: jest.fn(),
      registerSignatureHelpProvider: jest.fn(),
      registerHoverProvider: jest.fn(),
    },
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
    jest.mocked(ESQLLang.getSuggestionProvider).mockReturnValue(suggestionProvider);
    jest.mocked(ESQLLang.getSignatureProvider!).mockReturnValue(signatureProvider);
    jest.mocked(ESQLLang.getHoverProvider!).mockReturnValue(hoverProvider);
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
  });

  it('disposes registered providers on unmount', () => {
    const { unmount } = renderHook(() => useEsqlAutocomplete(services));

    unmount();

    expect(mockDisposeSuggestion).toHaveBeenCalledTimes(1);
    expect(mockDisposeSignature).toHaveBeenCalledTimes(1);
    expect(mockDisposeHover).toHaveBeenCalledTimes(1);
  });
});
