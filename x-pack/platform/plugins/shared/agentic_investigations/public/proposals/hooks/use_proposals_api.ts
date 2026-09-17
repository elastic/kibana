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
 * Pending proposals, already grouped and ranked by the API (category, then
 * impact, confidence and deadline). Expired ones are dropped: a deadline that
 * has passed is no longer a decision anyone can make.
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.proposals.all });
    },
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.proposals.all });
    },
  });
};
