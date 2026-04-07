/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useService } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import { useNavigateToRuleEventsInDiscover } from './use_rule_events_in_discover';

jest.mock('@kbn/core-di-browser');
jest.mock('@kbn/core-di', () => ({
  PluginStart: jest.fn((key: string) => key),
}));

const mockUseService = useService as jest.MockedFunction<typeof useService>;
const mockPluginStart = PluginStart as jest.MockedFunction<typeof PluginStart>;

const mockNavigate = jest.fn();
const mockLocator = { navigate: mockNavigate };
const mockLocatorsGet = jest.fn();
const mockShare = { url: { locators: { get: mockLocatorsGet } } };

describe('useNavigateToRuleEventsInDiscover', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPluginStart.mockImplementation((key) => key as any);
    mockUseService.mockImplementation((service: unknown) => {
      if (service === 'share') return mockShare as any;
      return undefined as any;
    });
  });

  it('returns undefined when the Discover locator is not registered', () => {
    mockLocatorsGet.mockReturnValue(undefined);

    const { result } = renderHook(() => useNavigateToRuleEventsInDiscover('rule-1'));

    expect(result.current).toBeUndefined();
  });

  it('returns a function when the Discover locator is registered', () => {
    mockLocatorsGet.mockReturnValue(mockLocator);

    const { result } = renderHook(() => useNavigateToRuleEventsInDiscover('rule-1'));

    expect(result.current).toBeInstanceOf(Function);
  });

  it('navigates with the rule-scoped ESQL query when invoked', async () => {
    mockLocatorsGet.mockReturnValue(mockLocator);

    const { result } = renderHook(() => useNavigateToRuleEventsInDiscover('rule-abc'));

    await act(async () => {
      await result.current!();
    });

    expect(mockNavigate).toHaveBeenCalledWith({
      query: { esql: 'FROM .rule-events | WHERE rule.id == "rule-abc"' },
    });
  });

  it('escapes the rule id in the ESQL passed to Discover when it contains quotes', async () => {
    mockLocatorsGet.mockReturnValue(mockLocator);

    const { result } = renderHook(() => useNavigateToRuleEventsInDiscover('abc"def'));

    await act(async () => {
      await result.current!();
    });

    expect(mockNavigate).toHaveBeenCalledWith({
      query: { esql: 'FROM .rule-events | WHERE rule.id == "abc\\"def"' },
    });
  });

  it('looks up the locator with the correct DISCOVER_APP_LOCATOR id', () => {
    mockLocatorsGet.mockReturnValue(mockLocator);

    renderHook(() => useNavigateToRuleEventsInDiscover('rule-1'));

    expect(mockLocatorsGet).toHaveBeenCalledWith('DISCOVER_APP_LOCATOR');
  });
});
