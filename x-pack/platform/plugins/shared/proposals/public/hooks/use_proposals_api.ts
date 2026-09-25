/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseInfiniteQueryResult } from '@kbn/react-query';
import {
  useInfiniteQuery,
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from '@kbn/react-query';
import type { HttpSetup } from '@kbn/core-http-browser';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  MAX_PROPOSALS_PAGE_SIZE,
  PROPOSALS_API_VERSION,
  PROPOSALS_INTERNAL_URL,
  PROPOSAL_SETTLING_POLL_INTERVAL_MS,
  isProposalSettling,
} from '@kbn/proposals-common';
import type {
  ApproveProposalRequest,
  DismissProposalRequest,
  ListProposalsResponse,
  Proposal,
  ProposalWithMetadata,
} from '@kbn/proposals-common';
import { mutationKeys, queryKeys } from '../query_keys';

const hasSettlingProposal = (response: ListProposalsResponse | undefined): boolean =>
  response?.proposals.some(isProposalSettling) ?? false;

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
        version: PROPOSALS_API_VERSION,
        query: {
          status: 'pending',
          excludeExpired: true,
          excludeSuperseded: true,
          ...(conversationId ? { conversationId } : {}),
        },
      }),
    keepPreviousData: true,
    // No baseline poll otherwise — only while a row is settling, so the badge notices the
    // action finish without the analyst having to reopen the modal to find out.
    refetchInterval: (data) =>
      hasSettlingProposal(data) ? PROPOSAL_SETTLING_POLL_INTERVAL_MS : false,
    retry: retryOnTransientError,
  });
};

/**
 * The accumulated row count rather than `pages.length * size`, which is what lets a shrunk last
 * page (see `MAX_PROPOSALS_PAGE_OFFSET`) still end paging correctly. `undefined` stops it.
 */
const nextConversationProposalsOffset = (
  lastPage: ListProposalsResponse,
  pages: ListProposalsResponse[]
): number | undefined => {
  const loaded = pages.reduce((count, page) => count + page.proposals.length, 0);
  return loaded >= lastPage.total ? undefined : loaded;
};

/**
 * Every proposal on one conversation, decided or not — the investigation flyout's own proposal
 * history, as opposed to `usePendingProposals`'s cross-conversation "awaiting a human" queue.
 * Superseded rows are still dropped: a retried proposal's earlier attempts are not history worth
 * a card of their own, only the live head is.
 *
 * Paged rather than a single fixed-size read: the list API caps a page at
 * `MAX_PROPOSALS_PAGE_SIZE`, so an investigation with more proposals than that would otherwise
 * silently lose its oldest ones. Requesting the largest page the API allows means the common case
 * (an investigation with under 100 proposals) still resolves in one request; only a longer history
 * needs `fetchNextPage`.
 */
export const useConversationProposals = (
  conversationId: string
): UseInfiniteQueryResult<ListProposalsResponse, unknown> => {
  const { services } = useKibana();

  return useInfiniteQuery({
    queryKey: queryKeys.proposals.forConversation(conversationId),
    queryFn: async ({ pageParam }: { pageParam?: number }): Promise<ListProposalsResponse> =>
      services.http!.get<ListProposalsResponse>(PROPOSALS_INTERNAL_URL, {
        version: PROPOSALS_API_VERSION,
        query: {
          conversationId,
          excludeSuperseded: true,
          size: MAX_PROPOSALS_PAGE_SIZE,
          from: pageParam ?? 0,
        },
      }),
    getNextPageParam: nextConversationProposalsOffset,
    // No `keepPreviousData`: unlike `usePendingProposals`'s cross-conversation queue, every row
    // here is actionable against `conversationId`. Showing the previous conversation's proposals
    // — un-flagged as stale — while this one loads would let an approve/dismiss click land on a
    // proposal from the investigation the analyst just navigated away from.
    refetchInterval: (data) =>
      (data?.pages ?? []).some(hasSettlingProposal) ? PROPOSAL_SETTLING_POLL_INTERVAL_MS : false,
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
          version: PROPOSALS_API_VERSION,
        }
      );
    },
    enabled: Boolean(id),
    refetchInterval: (data) =>
      data && isProposalSettling(data) ? PROPOSAL_SETTLING_POLL_INTERVAL_MS : false,
    retry: retryOnTransientError,
  });
};

/**
 * Both decision mutations refetch rather than reading the response body: the
 * route only releases the gating workflow, and the decision is written by that
 * workflow's post-gate steps, which run after the resume call has returned.
 *
 * Invalidating the root key (`proposals.all`) in one call sweeps every derived
 * view — platform `list`/`detail` and AlertZero `grouped`/`charts-summary` —
 * because those keys all share this prefix. A refetch that beats the post-gate
 * write reads `pending` once more; that is expected while the gate workflow
 * settles and is not a sign of a failed invalidation.
 *
 * Awaited, not fired-and-forgotten: `invalidateQueries` also refetches every
 * active matching query, and returning that promise from `onSuccess` keeps the
 * mutation itself — and therefore `useIsMutating` for it — pending until that
 * refetch lands. Without this, a submission could read as "done" the instant
 * the HTTP call returns, before the UI has any fresher data to show instead.
 */
const invalidateProposals = (queryClient: ReturnType<typeof useQueryClient>) =>
  queryClient.invalidateQueries({ queryKey: queryKeys.proposals.all });

/** How often, and for how long, to poll for the decision before giving up on it. */
const DECISION_POLL_INTERVAL_MS = 750;
const DECISION_POLL_MAX_ATTEMPTS = 8;

/**
 * `/approve` and `/dismiss` only resume the gate — see their route handlers for why the decision
 * itself is written by the gate workflow's own post-gate step, asynchronously, after the resume
 * call already returned. Polling the proposal directly, before invalidating anything, is what
 * lets the mutation itself — and therefore `useIsMutating` everywhere `isSubmitting` reads it —
 * bridge that specific gap, rather than settling on the first refetch, which can beat the write
 * and read `pending` once more with no decision to fall back on either.
 *
 * Bounded: a slow write should not hang the mutation forever. Giving up here does not lose the
 * update — `usePendingProposals`/`useConversationProposals`/`useProposal`'s own settling-aware
 * poll still catches it once the write lands, just on their cadence instead of this one.
 *
 * Best-effort: the decide POST already succeeded by the time this runs, so a read failure here
 * (a transient network blip, a 5xx) is not a decision failure and must not be treated as one —
 * swallow it and keep polling on the same schedule rather than rejecting, which would otherwise
 * surface "could not be recorded" for a decision the gate had already released.
 */
const waitForDecision = async (http: HttpSetup, id: string): Promise<void> => {
  for (let attempt = 0; attempt < DECISION_POLL_MAX_ATTEMPTS; attempt++) {
    try {
      const proposal = await http.get<ProposalWithMetadata>(
        `${PROPOSALS_INTERNAL_URL}/${encodeURIComponent(id)}`,
        { version: PROPOSALS_API_VERSION }
      );
      if (proposal.decision) {
        return;
      }
    } catch {
      // Treated the same as "not decided yet" — see the best-effort note above.
    }
    await new Promise((resolve) => setTimeout(resolve, DECISION_POLL_INTERVAL_MS));
  }
};

/**
 * Approving submits the action input the analyst was shown, so the API can
 * refuse an approval that no longer matches the record.
 */
export const useApproveProposal = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.proposals.approve,
    mutationFn: ({ id, body }: { id: string; body: ApproveProposalRequest }): Promise<Proposal> =>
      services.http!.post<Proposal>(`${PROPOSALS_INTERNAL_URL}/${encodeURIComponent(id)}/approve`, {
        version: PROPOSALS_API_VERSION,
        body: JSON.stringify(body),
      }),
    onSuccess: async (_data, { id }) => {
      await waitForDecision(services.http!, id);
      await invalidateProposals(queryClient);
    },
  });
};

export const useDismissProposal = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.proposals.decline,
    mutationFn: ({ id, body }: { id: string; body: DismissProposalRequest }): Promise<Proposal> =>
      services.http!.post<Proposal>(`${PROPOSALS_INTERNAL_URL}/${encodeURIComponent(id)}/dismiss`, {
        version: PROPOSALS_API_VERSION,
        body: JSON.stringify(body),
      }),
    onSuccess: async (_data, { id }) => {
      await waitForDecision(services.http!, id);
      await invalidateProposals(queryClient);
    },
  });
};

/**
 * Whether *this* proposal's approve/decline is currently in flight, read from the shared
 * mutation cache rather than component state — so the answer is the same for the flyout row and
 * the modal alike, and survives the modal being closed and reopened mid-submission (a local
 * `useState` tracking this would not: it dies with the component that owned it).
 *
 * `useIsMutating` only ever returns a count, so the predicate is what actually scopes it to one
 * proposal — every approve (or decline) shares the same `mutationKey`, and `variables` is the
 * `{ id, body }` a specific `mutate`/`mutateAsync` call was made with.
 */
export const useIsApprovingProposal = (id: string | undefined): boolean =>
  useIsMutating({
    mutationKey: mutationKeys.proposals.approve,
    predicate: (mutation) => id !== undefined && mutation.state.variables?.id === id,
  }) > 0;

export const useIsDecliningProposal = (id: string | undefined): boolean =>
  useIsMutating({
    mutationKey: mutationKeys.proposals.decline,
    predicate: (mutation) => id !== undefined && mutation.state.variables?.id === id,
  }) > 0;
