/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import { waitFor, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useGetRuleTypesQuery } from './use_get_rule_types_query';
import type { RuleType } from '@kbn/triggers-actions-ui-types';
import { getRuleTypes } from '../apis/get_rule_types';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { testQueryClientConfig } from '../test_utils';

const mockRuleTypes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }] as unknown as RuleType[];

jest.mock('../apis/get_rule_types');
const mockGetRuleTypes = jest.mocked(getRuleTypes);

const http = httpServiceMock.createStartContract();

const queryClient = new QueryClient(testQueryClientConfig);

export const Wrapper = ({ children }: PropsWithChildren) => {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe('useGetRuleTypesQuery', () => {
  beforeEach(() => {
    mockGetRuleTypes.mockResolvedValue(mockRuleTypes);
  });

  afterEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
  });

  it('should call the getRuleTypes API', async () => {
    const { result } = renderHook(
      () =>
        useGetRuleTypesQuery(
          {
            http,
          },
          { enabled: true }
        ),
      {
        wrapper: Wrapper,
      }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGetRuleTypes).toHaveBeenCalled();
    expect(result.current.data).toEqual(mockRuleTypes);
  });
});
