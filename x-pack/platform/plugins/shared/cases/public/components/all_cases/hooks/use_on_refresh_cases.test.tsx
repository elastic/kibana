/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook, act } from '@testing-library/react';

import { casesQueriesKeys } from '../../../containers/constants';
import { useRefreshCases } from './use_on_refresh_cases';
import { TestProviders, createTestQueryClient } from '../../../common/mock';
import React from 'react';

describe('useRefreshCases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should refresh data on refresh', async () => {
    const queryClient = createTestQueryClient();
    const queryClientSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useRefreshCases(), {
      wrapper: (props) => <TestProviders {...props} queryClient={queryClient} />,
    });

    act(() => {
      result.current();
    });

    expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.casesList());
    expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.tags());
    expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.userProfiles());
  });
});
