/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import type { HttpSetup } from '@kbn/core-http-browser';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { AGENTIC_INVESTIGATIONS_API_VERSION, PROPOSALS_INTERNAL_URL } from '../../../common';
import type { ApproveProposalRequest, DismissProposalRequest, Proposal } from '../../../common';

export type DecisionState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; proposal: Proposal }
  | { status: 'conflict'; message: string }
  | { status: 'expired'; message: string }
  | { status: 'error'; message: string };

/**
 * Mutation hook for approving and dismissing a proposal from inside the Agent
 * Builder attachment card.
 *
 * The card renders inside Agent Builder's React tree, so it cannot reuse any
 * investigation QueryClient context. It manages its own lightweight state and calls
 * the Kibana HTTP client directly.
 */
export const useProposalDecision = (http: HttpSetup) => {
  const [decisionState, setDecisionState] = useState<DecisionState>({ status: 'idle' });

  const mapError = useCallback((error: unknown): DecisionState => {
    if (isHttpFetchError(error)) {
      if (error.response?.status === 409) {
        return {
          status: 'conflict',
          message: 'This proposal has already been decided — refresh the card to see its status.',
        };
      }
      if (error.response?.status === 410) {
        return {
          status: 'expired',
          message: 'The decision deadline has passed and this proposal can no longer be decided.',
        };
      }
    }
    return {
      status: 'error',
      message:
        error instanceof Error
          ? error.message
          : 'The decision could not be recorded. Please try again.',
    };
  }, []);

  const approve = useCallback(
    async (id: string, body: ApproveProposalRequest) => {
      setDecisionState({ status: 'loading' });
      try {
        const proposal = await http.post<Proposal>(
          `${PROPOSALS_INTERNAL_URL}/${encodeURIComponent(id)}/approve`,
          { version: AGENTIC_INVESTIGATIONS_API_VERSION, body: JSON.stringify(body) }
        );
        setDecisionState({ status: 'success', proposal });
        return proposal;
      } catch (error) {
        setDecisionState(mapError(error));
        return undefined;
      }
    },
    [http, mapError]
  );

  const dismiss = useCallback(
    async (id: string, body: DismissProposalRequest) => {
      setDecisionState({ status: 'loading' });
      try {
        const proposal = await http.post<Proposal>(
          `${PROPOSALS_INTERNAL_URL}/${encodeURIComponent(id)}/dismiss`,
          { version: AGENTIC_INVESTIGATIONS_API_VERSION, body: JSON.stringify(body) }
        );
        setDecisionState({ status: 'success', proposal });
        return proposal;
      } catch (error) {
        setDecisionState(mapError(error));
        return undefined;
      }
    },
    [http, mapError]
  );

  const reset = useCallback(() => setDecisionState({ status: 'idle' }), []);

  return { decisionState, approve, dismiss, reset };
};
