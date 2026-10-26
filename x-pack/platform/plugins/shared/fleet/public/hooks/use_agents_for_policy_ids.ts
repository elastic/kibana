/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';

import type { Agent } from '../../common/types';
import { AGENTS_PREFIX } from '../../common/constants';
import { buildPolicyBaseIdsWithFallbackKuery } from '../../common/services';

import { sendGetAgentsForRq } from './use_request';

const AGENTS_PAGE_SIZE = 1000;
// Agents beyond this many pages are not fetched, so a very large policy is reported as truncated
// instead of being fetched without bound.
export const MAX_AGENTS_PAGES = 10;

export interface AgentsForPolicyIds {
  agents: Agent[];
  /** How many agents the policies have in total, as Fleet counts them. */
  total: number;
  /** True when `agents` is a subset of `total` because the page cap was reached. */
  isTruncated: boolean;
}

/** Every agent matching the kuery, across pages, up to `MAX_AGENTS_PAGES` pages. */
export const fetchAgentsByKuery = async (kuery: string): Promise<AgentsForPolicyIds> => {
  const fetchPage = (page: number) =>
    sendGetAgentsForRq({ kuery, perPage: AGENTS_PAGE_SIZE, page });
  const first = await fetchPage(1);
  const pageCount = Math.min(Math.ceil(first.total / AGENTS_PAGE_SIZE), MAX_AGENTS_PAGES);
  // A failed page fails the whole fetch, so a partial list is never returned as complete.
  const otherPages = await Promise.all(
    Array.from({ length: Math.max(pageCount - 1, 0) }, (_, i) => fetchPage(i + 2))
  );
  const agents = [first, ...otherPages].flatMap(({ items }) => items);
  return { agents, total: first.total, isTruncated: agents.length < first.total };
};

interface UseAgentsForPolicyIdsOptions {
  enabled?: boolean;
  /** Refetch every this many milliseconds. */
  refetchInterval?: number | false;
}

/**
 * The agents enrolled in the given agent policies, all pages of them. Matches on the base policy id
 * (falling back to the policy id), so agents on version-specific variants of a policy are included.
 */
export const useAgentsForPolicyIds = (
  policyIds: string[],
  { enabled = true, refetchInterval = false }: UseAgentsForPolicyIdsOptions = {}
) => {
  const kuery = useMemo(
    () =>
      buildPolicyBaseIdsWithFallbackKuery(
        policyIds,
        `${AGENTS_PREFIX}.policy_base_id`,
        `${AGENTS_PREFIX}.policy_id`
      ),
    [policyIds]
  );
  const { data, dataUpdatedAt, isInitialLoading, error } = useQuery<AgentsForPolicyIds, Error>(
    ['agents_for_policy_ids', kuery],
    () => fetchAgentsByKuery(kuery),
    {
      enabled: enabled && policyIds.length > 0,
      refetchInterval,
      refetchIntervalInBackground: false,
      // A polling consumer retries on the next tick, so a failure is reported right away.
      ...(refetchInterval !== false && { retry: false }),
    }
  );
  const agents = useMemo(() => data?.agents ?? [], [data]);

  return {
    agents,
    total: data?.total ?? 0,
    isTruncated: !!data?.isTruncated,
    dataUpdatedAt,
    // `isLoading` is also true for a disabled query, which is not loading anything.
    isLoading: isInitialLoading,
    error,
  };
};
