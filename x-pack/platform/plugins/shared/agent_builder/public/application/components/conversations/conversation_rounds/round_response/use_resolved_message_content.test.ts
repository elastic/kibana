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

const emailToken = 'EMAIL_token';

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
      tokenToOriginalMap: { [emailToken]: 'alice@example.com' },
      resolveText: (value: string) => value.replace(emailToken, 'alice@example.com'),
      isLoading: false,
      error: undefined,
    });
    useReplacementsHoldMock.mockReturnValue(false);
  });

  it('fetches replacements and deanonymizes tokens when showAnonymized is false (default)', () => {
    const { result } = renderHook(() =>
      useResolvedMessageContent({
        content: `Contact: ${emailToken}`,
        anonymizationEnabled: true,
        hasHttp: true,
        http,
        replacementsId: 'repl-1',
        showAnonymized: false,
        holdContentWhileResolvingReplacements: true,
        holdContentMaxMs: 600,
      })
    );

    expect(result.current.displayContent).toBe('Contact: alice@example.com');
    expect(useResolveAnonymizedValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        replacementsId: 'repl-1',
        enabled: true,
      })
    );
    expect(useReplacementsHoldMock).toHaveBeenCalledWith(
      expect.objectContaining({
        holdEnabled: true,
      })
    );
  });

  it('returns raw stored content (tokens) when showAnonymized is true', () => {
    const { result } = renderHook(() =>
      useResolvedMessageContent({
        content: `Contact: ${emailToken}`,
        anonymizationEnabled: true,
        hasHttp: true,
        http,
        replacementsId: 'repl-1',
        showAnonymized: true,
        holdContentWhileResolvingReplacements: true,
        holdContentMaxMs: 600,
      })
    );

    expect(result.current.displayContent).toBe(`Contact: ${emailToken}`);
    expect(useResolveAnonymizedValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        replacementsId: 'repl-1',
        enabled: false,
      })
    );
    expect(useReplacementsHoldMock).toHaveBeenCalledWith(
      expect.objectContaining({
        holdEnabled: false,
      })
    );
  });

  it('returns empty content while hold is active when showAnonymized is false', () => {
    useReplacementsHoldMock.mockReturnValue(true);

    const { result } = renderHook(() =>
      useResolvedMessageContent({
        content: emailToken,
        anonymizationEnabled: true,
        hasHttp: true,
        http,
        replacementsId: 'repl-1',
        showAnonymized: false,
        holdContentWhileResolvingReplacements: true,
        holdContentMaxMs: 600,
      })
    );

    expect(result.current.displayContent).toBe('');
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

  it('falls back to raw content when replacements are loading with showAnonymized false', () => {
    useResolveAnonymizedValuesMock.mockReturnValue({
      tokenToOriginalMap: {},
      resolveText: (value: string) => value,
      isLoading: true,
      error: undefined,
    });

    const { result } = renderHook(() =>
      useResolvedMessageContent({
        content: emailToken,
        anonymizationEnabled: true,
        hasHttp: true,
        http,
        replacementsId: 'repl-1',
        showAnonymized: false,
        holdContentWhileResolvingReplacements: false,
        holdContentMaxMs: 600,
      })
    );

    expect(result.current.displayContent).toBe(emailToken);
  });

  it('falls back to raw content when replacements resolution errors with showAnonymized false', () => {
    useResolveAnonymizedValuesMock.mockReturnValue({
      tokenToOriginalMap: {},
      resolveText: (value: string) => value,
      isLoading: false,
      error: new Error('resolution failed'),
    });

    const { result } = renderHook(() =>
      useResolvedMessageContent({
        content: emailToken,
        anonymizationEnabled: true,
        hasHttp: true,
        http,
        replacementsId: 'repl-1',
        showAnonymized: false,
        holdContentWhileResolvingReplacements: false,
        holdContentMaxMs: 600,
      })
    );

    expect(result.current.displayContent).toBe(emailToken);
  });

  it('disables replacements lookup when replacementsId is missing', () => {
    renderHook(() =>
      useResolvedMessageContent({
        content: emailToken,
        anonymizationEnabled: true,
        hasHttp: true,
        http,
        showAnonymized: false,
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

  it('returns content as-is when anonymization is disabled', () => {
    const { result } = renderHook(() =>
      useResolvedMessageContent({
        content: emailToken,
        anonymizationEnabled: false,
        hasHttp: true,
        http,
        replacementsId: 'repl-1',
        showAnonymized: false,
        holdContentWhileResolvingReplacements: false,
        holdContentMaxMs: 600,
      })
    );

    expect(result.current.displayContent).toBe(emailToken);
    expect(useResolveAnonymizedValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );
  });
});
