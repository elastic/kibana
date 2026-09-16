/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type PropsWithChildren } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@kbn/react-query';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import type { SourceRuleData } from '../types/source_rule_data';
import { createTestQueryClient } from './test_utils';
import { EpisodeDataSourceProvider } from '../context/episode_data_source_context';
import { createTestEpisodeSource } from '../types/episode_data_source.mock';
import { useResolveSourceRule } from './use_resolve_source_rule';

const mockRule: SourceRuleData = { id: 'r1', metadata: { name: 'Classic Rule' } };

const createWrapper = (dataSource?: ReturnType<typeof createTestEpisodeSource>) => {
  const queryClient = createTestQueryClient();
  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <EpisodeDataSourceProvider dataSource={dataSource}>
        {children}
      </EpisodeDataSourceProvider>
    </QueryClientProvider>
  );
  return { Wrapper, queryClient };
};

describe('useResolveSourceRule', () => {
  it('resolves a rule from the data source', async () => {
    const http = httpServiceMock.createStartContract();
    http.basePath.prepend.mockImplementation((path) => `/base${path}`);
    const source = createTestEpisodeSource({
      resolveRules: jest.fn().mockResolvedValue([mockRule]),
      getRuleDetailsHref: (ruleId) => `/app/management/rule/${ruleId}`,
    });
    const { Wrapper } = createWrapper(source);

    const { result } = renderHook(
      () => useResolveSourceRule({ ruleId: 'r1', http }),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(source.resolveRules).toHaveBeenCalledWith({
      services: { http },
      ids: ['r1'],
    });
    expect(result.current.rule).toEqual(mockRule);
    expect(result.current.ruleDetailsHref).toBe('/base/app/management/rule/r1');
  });

  it('returns undefined rule when the source returns no matches', async () => {
    const http = httpServiceMock.createStartContract();
    http.basePath.prepend.mockImplementation((path) => `/base${path}`);
    const source = createTestEpisodeSource({
      resolveRules: jest.fn().mockResolvedValue([]),
    });
    const { Wrapper } = createWrapper(source);

    const { result } = renderHook(
      () => useResolveSourceRule({ ruleId: 'r1', http }),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.rule).toBeUndefined();
  });

  it('does not call resolveRules when ruleId is undefined', () => {
    const http = httpServiceMock.createStartContract();
    const source = createTestEpisodeSource({
      resolveRules: jest.fn().mockResolvedValue([mockRule]),
    });
    const { Wrapper } = createWrapper(source);

    const { result } = renderHook(
      () => useResolveSourceRule({ ruleId: undefined, http }),
      { wrapper: Wrapper }
    );

    expect(source.resolveRules).not.toHaveBeenCalled();
    expect(result.current.rule).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('does not call resolveRules when there is no data source', () => {
    const http = httpServiceMock.createStartContract();
    const { Wrapper } = createWrapper(undefined);

    const { result } = renderHook(
      () => useResolveSourceRule({ ruleId: 'r1', http }),
      { wrapper: Wrapper }
    );

    expect(result.current.rule).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('returns null ruleDetailsHref when the source does not provide getRuleDetailsHref', async () => {
    const http = httpServiceMock.createStartContract();
    const source = createTestEpisodeSource({
      resolveRules: jest.fn().mockResolvedValue([mockRule]),
    });
    const { Wrapper } = createWrapper(source);

    const { result } = renderHook(
      () => useResolveSourceRule({ ruleId: 'r1', http }),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.ruleDetailsHref).toBeNull();
  });
});
