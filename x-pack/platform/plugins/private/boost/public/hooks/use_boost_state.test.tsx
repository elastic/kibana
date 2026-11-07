/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { BOOST_PROFILES_API_PATH, BOOST_RULES_API_PATH } from '../../common/constants';
import { useDeleteProfileAndRules } from './use_boost_state';

const mockDelete = jest.fn();
jest.mock('./use_boost_services', () => ({
  useBoostServices: () => ({ http: { delete: mockDelete } }),
}));

// An error like Kibana's HTTP client throws for an error response.
const httpError = (status: number, message: string) =>
  Object.assign(new Error('Request failed'), { body: { message }, response: { status } });

const deleteProfile = (ruleNames: string[]) => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useDeleteProfileAndRules(), { wrapper });
  return result.current.mutateAsync({ name: 'catalog-search', ruleNames });
};

describe('useDeleteProfileAndRules', () => {
  beforeEach(() => {
    mockDelete.mockReset();
    mockDelete.mockResolvedValue({});
  });

  it('deletes each rule that uses the profile, and then the profile', async () => {
    const deletion = await deleteProfile(['catalogs', 'archives']);

    expect(deletion).toEqual({ ruleCount: 2, failures: [] });
    expect(mockDelete.mock.calls.map(([path]) => path)).toEqual([
      `${BOOST_RULES_API_PATH}/catalogs`,
      `${BOOST_RULES_API_PATH}/archives`,
      `${BOOST_PROFILES_API_PATH}/catalog-search`,
    ]);
  });

  it('keeps the profile when a rule fails to delete, saying why', async () => {
    mockDelete.mockImplementation(async (path: string) => {
      if (path.endsWith('/archives')) {
        throw httpError(504, "Elasticsearch didn't respond in time.");
      }
      return {};
    });

    const deletion = await deleteProfile(['catalogs', 'archives']);

    expect(deletion).toEqual({
      ruleCount: 2,
      failures: [
        { kind: 'rule', name: 'archives', message: "Elasticsearch didn't respond in time." },
      ],
    });
    // Elasticsearch would refuse it while a rule uses it.
    expect(mockDelete).not.toHaveBeenCalledWith(`${BOOST_PROFILES_API_PATH}/catalog-search`);
  });

  it('counts a rule that was already deleted as deleted', async () => {
    mockDelete.mockImplementation(async (path: string) => {
      if (path.endsWith('/archives')) {
        throw httpError(404, 'Boost rule [archives] not found.');
      }
      return {};
    });

    expect(await deleteProfile(['catalogs', 'archives'])).toEqual({ ruleCount: 2, failures: [] });
    expect(mockDelete).toHaveBeenCalledWith(`${BOOST_PROFILES_API_PATH}/catalog-search`);
  });

  it('says why the profile failed to delete once its rules are deleted', async () => {
    mockDelete.mockImplementation(async (path: string) => {
      if (path.startsWith(BOOST_PROFILES_API_PATH)) {
        throw httpError(504, "Elasticsearch didn't respond in time.");
      }
      return {};
    });

    expect(await deleteProfile(['catalogs'])).toEqual({
      ruleCount: 1,
      failures: [
        {
          kind: 'profile',
          name: 'catalog-search',
          message: "Elasticsearch didn't respond in time.",
        },
      ],
    });
  });
});
