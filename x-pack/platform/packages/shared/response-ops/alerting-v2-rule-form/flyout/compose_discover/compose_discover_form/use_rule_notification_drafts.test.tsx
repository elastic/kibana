/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { INLINE_WORKFLOW_TAG } from '../../../actions_form';
import { useRuleNotificationDrafts } from './use_rule_notification_drafts';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
    logger: { log: () => {}, warn: () => {}, error: () => {} },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const matchResponse = (policies: unknown[]) => ({
  items: policies.map((actionPolicy) => ({ actionPolicy, category: 'global-filtered' })),
});

const ruleScopedPolicy = (overrides: Record<string, unknown> = {}) => ({
  id: 'policy-1',
  version: 'v1',
  matcher: 'rule.id: "rule-1"',
  destinations: [{ type: 'workflow', id: 'wf-1' }],
  ...overrides,
});

describe('useRuleNotificationDrafts', () => {
  it('does not fetch in create mode (no ruleId)', async () => {
    const http = httpServiceMock.createStartContract();

    const { result } = renderHook(() => useRuleNotificationDrafts({ http }), {
      wrapper: createWrapper(),
    });

    await new Promise((r) => setTimeout(r, 50));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.drafts).toEqual([]);
    expect(http.fetch).not.toHaveBeenCalled();
  });

  it('populates an inline draft from a tagged workflow', async () => {
    const http = httpServiceMock.createStartContract();
    http.fetch.mockResolvedValueOnce(matchResponse([ruleScopedPolicy()]) as any);
    http.get.mockResolvedValueOnce({
      id: 'wf-1',
      definition: {
        tags: [INLINE_WORKFLOW_TAG],
        steps: [
          {
            type: 'email',
            'connector-id': 'c1',
            with: { to: 'a@b.com', subject: 's', message: 'm' },
          },
        ],
      },
    } as any);

    const { result } = renderHook(() => useRuleNotificationDrafts({ http, ruleId: 'rule-1' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.drafts).toEqual([
      expect.objectContaining({
        id: 'policy-1',
        source: 'inline',
        stepType: 'email',
        connectorId: 'c1',
        // Carries its source so saving can update/delete it instead of duplicating.
        origin: { policyId: 'policy-1', policyVersion: 'v1', workflowId: 'wf-1' },
      }),
    ]);
    expect(http.get).toHaveBeenCalledWith(
      '/api/workflows/workflow/wf-1',
      expect.objectContaining({ version: '2023-10-31' })
    );
  });

  it('gives two policies backed by the same workflow distinct row ids', async () => {
    const http = httpServiceMock.createStartContract();
    http.fetch.mockResolvedValueOnce(
      matchResponse([
        ruleScopedPolicy({ id: 'policy-1' }),
        ruleScopedPolicy({ id: 'policy-2' }),
      ]) as any
    );
    // Both policies point at the same workflow.
    http.get.mockResolvedValue({
      id: 'wf-1',
      definition: {
        tags: [INLINE_WORKFLOW_TAG],
        steps: [{ type: 'email', 'connector-id': 'c1', with: { to: 'a@b.com' } }],
      },
    } as any);

    const { result } = renderHook(() => useRuleNotificationDrafts({ http, ruleId: 'rule-1' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.drafts.map((d) => d.id)).toEqual(['policy-1', 'policy-2']);
  });

  it('deduplicates a policy returned under multiple match categories', async () => {
    const http = httpServiceMock.createStartContract();
    // The same policy appears twice (e.g. matched as "global" and "global-filtered").
    http.fetch.mockResolvedValueOnce(
      matchResponse([ruleScopedPolicy(), ruleScopedPolicy()]) as any
    );
    http.get.mockResolvedValue({
      id: 'wf-1',
      definition: {
        tags: [INLINE_WORKFLOW_TAG],
        steps: [{ type: 'email', 'connector-id': 'c1', with: { to: 'a@b.com' } }],
      },
    } as any);

    const { result } = renderHook(() => useRuleNotificationDrafts({ http, ruleId: 'rule-1' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.drafts).toHaveLength(1);
    expect(http.get).toHaveBeenCalledTimes(1);
  });

  it('ignores policies that are not rule-scoped simple actions', async () => {
    const http = httpServiceMock.createStartContract();
    http.fetch.mockResolvedValueOnce(
      matchResponse([
        ruleScopedPolicy({ matcher: null }), // global, not rule-scoped
        ruleScopedPolicy({
          id: 'policy-multi',
          destinations: [
            { type: 'workflow', id: 'wf-a' },
            { type: 'workflow', id: 'wf-b' },
          ],
        }), // multiple destinations
      ]) as any
    );

    const { result } = renderHook(() => useRuleNotificationDrafts({ http, ruleId: 'rule-1' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.drafts).toEqual([]);
    expect(http.get).not.toHaveBeenCalled();
  });
});
