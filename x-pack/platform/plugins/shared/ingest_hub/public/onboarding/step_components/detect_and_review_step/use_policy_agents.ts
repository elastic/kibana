/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import {
  AGENTS_PREFIX,
  buildPolicyBaseIdsWithFallbackKuery,
  type Agent,
} from '@kbn/fleet-plugin/common';
import { sendGetAgents } from '@kbn/fleet-plugin/public';

const POLL_INTERVAL_MS = 10_000;
const PAGE_SIZE = 1000;
// A selected policy can hold more agents than one page. Beyond this many pages the rest are not
// fetched, so a policy that large is reported as truncated instead of fetched without bound.
export const MAX_AGENT_PAGES = 10;

export interface PolicyAgents {
  agents: Agent[];
  /** How many agents the policies have in total, as Fleet counts them. */
  total: number;
  /** True when `agents` is a subset of `total` because the page cap was reached. */
  isTruncated: boolean;
}

const fetchAgentsPage = async (kuery: string, page: number) => {
  const { data, error } = await sendGetAgents({ kuery, perPage: PAGE_SIZE, page });
  if (error || !data) throw error ?? new Error('Could not fetch the agents');
  return data;
};

/** Every agent matching the kuery, across pages, up to `MAX_AGENT_PAGES` pages. */
export const fetchPolicyAgents = async (kuery: string): Promise<PolicyAgents> => {
  const first = await fetchAgentsPage(kuery, 1);
  const pageCount = Math.min(Math.ceil(first.total / PAGE_SIZE), MAX_AGENT_PAGES);
  const otherPages = await Promise.all(
    Array.from({ length: Math.max(pageCount - 1, 0) }, (_, i) => fetchAgentsPage(kuery, i + 2))
  );
  const agents = [first, ...otherPages].flatMap(({ items }) => items) as Agent[];
  return { agents, total: first.total, isTruncated: agents.length < first.total };
};

interface UsePolicyAgentsParams {
  /** Agent policies whose agents to list. */
  policyIds: string[];
  /** Refetch every 10 s while true. */
  shouldPoll: boolean;
}

/** The agents on the given agent policies, all pages of them. */
export function usePolicyAgents({ policyIds, shouldPoll }: UsePolicyAgentsParams) {
  const kuery = useMemo(
    () =>
      buildPolicyBaseIdsWithFallbackKuery(
        policyIds,
        `${AGENTS_PREFIX}.policy_base_id`,
        `${AGENTS_PREFIX}.policy_id`
      ),
    [policyIds]
  );
  const { data, dataUpdatedAt } = useQuery<PolicyAgents>({
    queryKey: ['ingest_hub', 'policy_agents', kuery],
    queryFn: () => fetchPolicyAgents(kuery),
    enabled: policyIds.length > 0,
    refetchInterval: shouldPoll ? POLL_INTERVAL_MS : false,
  });
  const agents = useMemo(() => data?.agents ?? [], [data]);

  return { agents, dataUpdatedAt, isTruncated: !!data?.isTruncated };
}
