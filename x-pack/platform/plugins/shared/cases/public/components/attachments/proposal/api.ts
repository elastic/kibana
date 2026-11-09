/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import type { HttpStart } from '@kbn/core/public';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import type {
  ApproveProposalRequest,
  DismissProposalRequest,
  ListProposalsResponse,
  Proposal,
  ProposalWithMetadata,
} from '@kbn/proposals-common';
import {
  MAX_PROPOSALS_PAGE_SIZE,
  PROPOSALS_API_VERSION,
  PROPOSALS_INTERNAL_URL,
  PROPOSAL_SETTLING_POLL_INTERVAL_MS,
  isAwaitingDecision,
  isProposalSettling,
} from '@kbn/proposals-common';
import { useKibana } from '../../../common/lib/kibana';

const proposalQueryKeys = {
  all: ['cases', 'proposals'] as const,
  byId: (id: string) => [...proposalQueryKeys.all, 'byId', id] as const,
  chains: (rootProposalIds: readonly string[]) =>
    [...proposalQueryKeys.all, 'chains', ...rootProposalIds] as const,
};

const getProposal = (http: HttpStart, id: string, signal?: AbortSignal) =>
  http.get<ProposalWithMetadata>(`${PROPOSALS_INTERNAL_URL}/${encodeURIComponent(id)}`, {
    version: PROPOSALS_API_VERSION,
    signal,
  });

const getProposalChains = (
  http: HttpStart,
  rootProposalIds: readonly string[],
  signal?: AbortSignal
) =>
  http.get<ListProposalsResponse>(PROPOSALS_INTERNAL_URL, {
    version: PROPOSALS_API_VERSION,
    query: {
      rootProposalIds: [...rootProposalIds],
      size: MAX_PROPOSALS_PAGE_SIZE,
      order: 'newest',
    },
    signal,
  });

/** Reads one proposal. A missing or unreadable proposal is an error, not a retry. */
export const useGetProposal = (id: string) => {
  const {
    services: { http },
  } = useKibana();
  return useQuery({
    queryKey: proposalQueryKeys.byId(id),
    queryFn: ({ signal }) => getProposal(http, id, signal),
    retry: false,
    // An approved action is still running, so its outcome is not in yet.
    refetchInterval: (proposal) =>
      proposal && isProposalSettling(proposal) ? PROPOSAL_SETTLING_POLL_INTERVAL_MS : false,
  });
};

/** Reads every revision of the given chains, so a row can show the chain's live head. */
export const useGetProposalChains = (rootProposalIds: readonly string[]) => {
  const {
    services: { http },
  } = useKibana();
  return useQuery({
    queryKey: proposalQueryKeys.chains(rootProposalIds),
    queryFn: ({ signal }) => getProposalChains(http, rootProposalIds, signal),
    enabled: rootProposalIds.length > 0,
    retry: false,
  });
};

const DECISION_POLL_INTERVAL_MS = 1_000;
const DECISION_POLL_MAX_ATTEMPTS = 20;

/**
 * Deciding releases the gate, and its workflow records the decision moments later. Waits for that,
 * best effort, so the refetch shows the decision.
 */
const waitForDecision = async (http: HttpStart, id: string, signal: AbortSignal): Promise<void> => {
  for (let attempt = 0; attempt < DECISION_POLL_MAX_ATTEMPTS && !signal.aborted; attempt++) {
    const proposal = await getProposal(http, id, signal).catch(() => undefined);
    // Decided, or replaced by a revision the gate decided instead: either way, nothing to wait for.
    if (proposal && (proposal.supersededBy !== undefined || !isAwaitingDecision(proposal))) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, DECISION_POLL_INTERVAL_MS));
  }
};

/** Approves or declines a proposal through the proposals API, as the current user. */
export const useDecideProposal = (id: string) => {
  const {
    services: { http },
  } = useKibana();
  const queryClient = useQueryClient();
  // Stops waiting for the decision once the activity row is gone.
  const unmounted = useRef(new AbortController());
  useEffect(() => {
    const controller = new AbortController();
    unmounted.current = controller;
    return () => controller.abort();
  }, []);

  const onSuccess = async () => {
    await waitForDecision(http, id, unmounted.current.signal);
    await queryClient.invalidateQueries({ queryKey: proposalQueryKeys.all });
  };

  const approve = useMutation({
    mutationFn: (body: ApproveProposalRequest) =>
      http.post<Proposal>(`${PROPOSALS_INTERNAL_URL}/${encodeURIComponent(id)}/approve`, {
        version: PROPOSALS_API_VERSION,
        body: JSON.stringify(body),
      }),
    onSuccess,
  });

  const dismiss = useMutation({
    mutationFn: (body: DismissProposalRequest) =>
      http.post<Proposal>(`${PROPOSALS_INTERNAL_URL}/${encodeURIComponent(id)}/dismiss`, {
        version: PROPOSALS_API_VERSION,
        body: JSON.stringify(body),
      }),
    onSuccess,
  });

  return { approve, dismiss };
};
