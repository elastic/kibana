/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import {
  createAnonymizationReplacementsClient,
  useResolveAnonymizedValues,
} from '@kbn/anonymization-ui';
import { useReplacementsHold } from './use_replacements_hold';
import { useResolvedMessageContent } from './use_resolved_message_content';

jest.mock('@kbn/anonymization-ui/src/common/services/replacements/client', () => ({
  createAnonymizationReplacementsClient: jest.fn(),
}));

jest.mock('@kbn/anonymization-ui/src/common/hooks/use_resolve_anonymized_values', () => ({
  useResolveAnonymizedValues: jest.fn(),
}));

jest.mock('./use_replacements_hold', () => ({
  useReplacementsHold: jest.fn(),
}));

const createAnonymizationReplacementsClientMock =
  createAnonymizationReplacementsClient as jest.MockedFunction<
    typeof createAnonymizationReplacementsClient
  >;
const useResolveAnonymizedValuesMock = useResolveAnonymizedValues as jest.MockedFunction<
  typeof useResolveAnonymizedValues
>;
const useReplacementsHoldMock = useReplacementsHold as jest.MockedFunction<
  typeof useReplacementsHold
>;

describe('useResolvedMessageContent', () => {
  const http = {} as Parameters<typeof createAnonymizationReplacementsClient>[0];
  const replacementsClient = {
    getReplacements: jest.fn(),
    deanonymizeText: jest.fn(),
    getTokenToOriginalMap: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    createAnonymizationReplacementsClientMock.mockReturnValue(replacementsClient);
    useResolveAnonymizedValuesMock.mockReturnValue({
      tokenToOriginalMap: {},
      resolveText: (value: string) => value.replace('EMAIL_token', 'alice@example.com'),
      isLoading: false,
      error: undefined,
    });
    useReplacementsHoldMock.mockReturnValue(false);
  });

  it('returns resolved content when replacements are available', () => {
    const { result } = renderHook(() =>
      useResolvedMessageContent({
        content: 'Contact: EMAIL_token',
        anonymizationEnabled: true,
        hasHttp: true,
        http,
        replacementsId: 'repl-1',
        holdContentWhileResolvingReplacements: true,
        holdContentMaxMs: 600,
      })
    );

    expect(result.current.displayContent).toBe('Contact: alice@example.com');
    expect(createAnonymizationReplacementsClientMock).toHaveBeenCalledWith(http);
    expect(useResolveAnonymizedValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        replacementsId: 'repl-1',
        enabled: true,
      })
    );
    expect(useReplacementsHoldMock).toHaveBeenCalledWith(
      expect.objectContaining({
        holdEnabled: true,
        holdMaxMs: 600,
        hasHttp: true,
        replacementsId: 'repl-1',
        isResolvingReplacements: false,
      })
    );
  });

  it('returns empty content while hold is active', () => {
    useReplacementsHoldMock.mockReturnValue(true);

    const { result } = renderHook(() =>
      useResolvedMessageContent({
        content: 'EMAIL_token',
        anonymizationEnabled: true,
        hasHttp: true,
        http,
        replacementsId: 'repl-1',
        holdContentWhileResolvingReplacements: true,
        holdContentMaxMs: 600,
      })
    );

    expect(result.current.displayContent).toBe('');
  });

  it('falls back to original content when replacements are loading', () => {
    useResolveAnonymizedValuesMock.mockReturnValue({
      tokenToOriginalMap: {},
      resolveText: (value: string) => value.replace('EMAIL_token', 'alice@example.com'),
      isLoading: true,
      error: undefined,
    });

    const { result } = renderHook(() =>
      useResolvedMessageContent({
        content: 'EMAIL_token',
        anonymizationEnabled: true,
        hasHttp: true,
        http,
        replacementsId: 'repl-1',
        holdContentWhileResolvingReplacements: false,
        holdContentMaxMs: 600,
      })
    );

    expect(result.current.displayContent).toBe('EMAIL_token');
  });

  it('falls back to original content when replacements resolution errors', () => {
    useResolveAnonymizedValuesMock.mockReturnValue({
      tokenToOriginalMap: {},
      resolveText: (value: string) => value.replace('EMAIL_token', 'alice@example.com'),
      isLoading: false,
      error: new Error('resolution failed'),
    });

    const { result } = renderHook(() =>
      useResolvedMessageContent({
        content: 'EMAIL_token',
        anonymizationEnabled: true,
        hasHttp: true,
        http,
        replacementsId: 'repl-1',
        holdContentWhileResolvingReplacements: false,
        holdContentMaxMs: 600,
      })
    );

    expect(result.current.displayContent).toBe('EMAIL_token');
  });

  it('disables replacements lookup when replacementsId is missing', () => {
    renderHook(() =>
      useResolvedMessageContent({
        content: 'EMAIL_token',
        anonymizationEnabled: true,
        hasHttp: true,
        http,
        holdContentWhileResolvingReplacements: false,
        holdContentMaxMs: 600,
      })
    );

    expect(useResolveAnonymizedValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        replacementsId: undefined,
        enabled: false,
      })
    );
  });

  it('disables replacements lookup when anonymization is disabled', () => {
    const { result } = renderHook(() =>
      useResolvedMessageContent({
        content: 'EMAIL_token',
        anonymizationEnabled: false,
        hasHttp: true,
        http,
        replacementsId: 'repl-1',
        holdContentWhileResolvingReplacements: false,
        holdContentMaxMs: 600,
      })
    );

    expect(result.current.displayContent).toBe('EMAIL_token');
    expect(useResolveAnonymizedValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        replacementsId: 'repl-1',
        enabled: false,
      })
    );
  });
});
