/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { AGENTIC_INVESTIGATIONS_API_VERSION, PROPOSALS_INTERNAL_URL } from '../../../common';
import type {
  ApproveProposalRequest,
  DismissProposalRequest,
  ListProposalsResponse,
  Proposal,
  ProposalWithMetadata,
} from '../../../common';
import { queryKeys } from '../query_keys';

/**
 * Retries on transient failures (network errors and 5xx responses), stops
 * after 3 attempts. 4xx errors are not transient — they indicate a caller
 * or server-configuration problem that a retry cannot fix. 501 is excluded
 * explicitly because it signals that the feature is not available on this
 * deployment (not a network blip).
 */
export const retryOnTransientError = (failureCount: number, error: unknown): boolean => {
  if (failureCount >= 3) {
    return false;
  }
  if (isHttpFetchError(error)) {
    const status = error.response?.status;
    if (status === 501) {
      return false;
    }
    return !status || status >= 500;
  }
  return true;
};

/**
 * Proposals awaiting a human, already grouped and ranked by the API (category,
 * then impact, confidence and deadline).
 *
 * `status: 'pending'` is the whole "awaiting" condition, since that status is
 * only ever valid while undecided. `excludeExpired` is still needed alongside
 * it, because it filters on the deadline *date*: between a deadline passing and
 * the gate workflow settling the record there is task lag during which it still
 * reads `pending`, and a decision nobody can make any more has no business in
 * the queue. `excludeSuperseded` drops the earlier attempts of a retried
 * proposal, so a chain of failures appears once rather than once per attempt.
 */
export const usePendingProposals = (conversationId?: string) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.proposals.list(conversationId),
    queryFn: async (): Promise<ListProposalsResponse> =>
      services.http!.get<ListProposalsResponse>(PROPOSALS_INTERNAL_URL, {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        query: {
          status: 'pending',
          excludeExpired: true,
          excludeSuperseded: true,
          ...(conversationId ? { conversationId } : {}),
        },
      }),
    keepPreviousData: true,
    retry: retryOnTransientError,
  });
};

export const useProposal = (id: string | undefined) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.proposals.detail(id),
    queryFn: async (): Promise<ProposalWithMetadata> => {
      if (!id) {
        throw new Error('proposal id is required');
      }
      return services.http!.get<ProposalWithMetadata>(
        `${PROPOSALS_INTERNAL_URL}/${encodeURIComponent(id)}`,
        {
          version: AGENTIC_INVESTIGATIONS_API_VERSION,
        }
      );
    },
    enabled: Boolean(id),
    retry: retryOnTransientError,
  });
};

/**
 * Both decision mutations refetch rather than reading the response body: the
 * route only releases the gating workflow, and the decision is written by that
 * workflow's post-gate steps, which run after the resume call has returned.
 *
 * The id therefore comes from the mutation's variables, not from a response
 * body that still describes an undecided proposal. A refetch that beats the
 * post-gate write reads `pending` once more, which is what the `executing`
 * state being added separately is for — nothing here can wait for a write that
 * lands out of band.
 */
const invalidateProposal = (
  queryClient: ReturnType<typeof useQueryClient>,
  { id }: { id: string }
) => {
  void queryClient.invalidateQueries({ queryKey: queryKeys.proposals.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.proposals.detail(id) });
};

/**
 * Approving submits the action input the analyst was shown, so the API can
 * refuse an approval that no longer matches the record.
 */
export const useApproveProposal = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ApproveProposalRequest }): Promise<Proposal> =>
      services.http!.post<Proposal>(`${PROPOSALS_INTERNAL_URL}/${encodeURIComponent(id)}/approve`, {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        body: JSON.stringify(body),
      }),
    onSuccess: (_proposal, { id }) => invalidateProposal(queryClient, { id }),
  });
};

export const useDismissProposal = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: DismissProposalRequest }): Promise<Proposal> =>
      services.http!.post<Proposal>(`${PROPOSALS_INTERNAL_URL}/${encodeURIComponent(id)}/dismiss`, {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        body: JSON.stringify(body),
      }),
    onSuccess: (_proposal, { id }) => invalidateProposal(queryClient, { id }),
  });
};
