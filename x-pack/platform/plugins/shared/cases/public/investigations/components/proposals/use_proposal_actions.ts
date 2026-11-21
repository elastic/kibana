/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { INVESTIGATION_AGENT_ID } from '../../../../common/investigations/types';
import type { ItemPatch, ProposalItem } from '../../../../common/investigations/types';
import { useInvestigationToasts, useUpdateItem } from '../../hooks';
import { useInvestigationsServices } from '../../services';
import { useCurrentActor } from './use_current_actor';
import * as i18n from './translations';

const CONVERSE_URL = '/api/agent_builder/converse';
const CONVERSE_API_VERSION = '2023-10-31';

export interface ProposalRevision {
  title: string;
  effect: string;
  scope: Array<[string, string]>;
  /** What the person asked to change. */
  request: string;
}

interface ConverseResponse {
  response?: { message?: string };
}

/**
 * Decisions on proposals. Every function resolves to true when the change was saved. Errors
 * (including 409 conflicts) are already reported by `useUpdateItem`.
 */
export const useProposalActions = (recordId: string) => {
  const { http } = useInvestigationsServices();
  const { mutateAsync, isLoading } = useUpdateItem(recordId);
  const { showSuccess } = useInvestigationToasts();
  const actor = useCurrentActor();

  const patchProposal = useCallback(
    async (proposal: ProposalItem, patch: ItemPatch): Promise<boolean> => {
      try {
        await mutateAsync({ itemId: proposal.id, version: proposal.version ?? '', patch });
        return true;
      } catch {
        return false;
      }
    },
    [mutateAsync]
  );

  const approve = useCallback(
    async (proposal: ProposalItem): Promise<boolean> => {
      const saved = await patchProposal(proposal, { status: 'approved' });
      if (saved) {
        showSuccess(i18n.APPROVED_TOAST(proposal.title));
      }
      return saved;
    },
    [patchProposal, showSuccess]
  );

  const reject = useCallback(
    async (proposal: ProposalItem, reason: string, note: string): Promise<boolean> => {
      const trimmedNote = note.trim();
      const saved = await patchProposal(proposal, {
        status: 'rejected',
        proposal: {
          decision: {
            by: actor ?? proposal.updated_by,
            at: new Date().toISOString(),
            reason,
            note: trimmedNote.length > 0 ? trimmedNote : null,
          },
        },
      });
      if (saved) {
        showSuccess(i18n.REJECTED_TOAST(proposal.title));
      }
      return saved;
    },
    [actor, patchProposal, showSuccess]
  );

  const reopen = useCallback(
    async (proposal: ProposalItem): Promise<boolean> => {
      const saved = await patchProposal(proposal, { status: 'pending' });
      if (saved) {
        showSuccess(i18n.REOPENED_TOAST(proposal.title));
      }
      return saved;
    },
    [patchProposal, showSuccess]
  );

  /** Applies a revision: the next version, with the request recorded in the revision list. */
  const revise = useCallback(
    async (proposal: ProposalItem, revision: ProposalRevision): Promise<number | null> => {
      const nextRevision = proposal.proposal.revision + 1;
      const saved = await patchProposal(proposal, {
        title: revision.title,
        proposal: {
          effect: revision.effect,
          scope: revision.scope,
          revision: nextRevision,
          revisions: [
            ...(proposal.proposal.revisions ?? []),
            {
              at: new Date().toISOString(),
              by: actor ?? proposal.updated_by,
              title: revision.title,
              request: revision.request,
            },
          ],
        },
      });
      if (!saved) {
        return null;
      }
      showSuccess(i18n.REVISED_TOAST(nextRevision));
      return nextRevision;
    },
    [actor, patchProposal, showSuccess]
  );

  /** Sends the request to the investigation conversation and returns the agent's reply. */
  const askAgent = useCallback(
    async (conversationId: string, proposal: ProposalItem, request: string): Promise<string> => {
      const result = await http.post<ConverseResponse>(CONVERSE_URL, {
        version: CONVERSE_API_VERSION,
        body: JSON.stringify({
          agent_id: INVESTIGATION_AGENT_ID,
          conversation_id: conversationId,
          input: `Revise proposal ${proposal.ref}: ${request}`,
        }),
      });
      return result.response?.message ?? '';
    },
    [http]
  );

  return { approve, reject, reopen, revise, askAgent, isUpdating: isLoading };
};
