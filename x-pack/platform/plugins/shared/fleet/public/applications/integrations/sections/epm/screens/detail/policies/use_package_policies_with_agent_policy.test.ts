/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook } from '@testing-library/react';

import { useConditionalRequest } from '../../../../../hooks';

import { usePackagePoliciesWithAgentPolicy } from './use_package_policies_with_agent_policy';

vi.mock('../../../../../hooks', async () => {
      const mocked = {
      ...(await vi.importActual('../../../../../hooks')),
      useConditionalRequest: vi.fn().mockReturnValue({
        data: null,
        error: null,
        isLoading: false,
        sendRequest: vi.fn(),
      }),
    };
      return { ...mocked, default: mocked };
    });

describe('usePackagePoliciesWithAgentPolicy', () => {
  beforeEach(() => {
    vi.mocked(useConditionalRequest).mockClear();
  });

  it('sends the package-policy list request by default', () => {
    renderHook(() => usePackagePoliciesWithAgentPolicy({ page: 1, perPage: 10, kuery: 'foo' }));

    expect(vi.mocked(useConditionalRequest)).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'get',
        query: { page: 1, perPage: 10, kuery: 'foo' },
        shouldSendRequest: true,
      })
    );
  });

  it('sends no requests when disabled', () => {
    renderHook(() =>
      usePackagePoliciesWithAgentPolicy({ page: 1, perPage: 10 }, { enabled: false })
    );

    // Both the package-policy list request and the bulk agent-policy request are skipped.
    for (const [config] of vi.mocked(useConditionalRequest).mock.calls) {
      expect(config.shouldSendRequest).toBe(false);
    }
  });
});
