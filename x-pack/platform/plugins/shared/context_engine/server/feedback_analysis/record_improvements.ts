/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { MAX_IMPROVEMENTS_PER_RUN } from '../../common/constants';
import type { ImprovementAction } from '../../common/http_api/improvement_actions';
import type { RecordImprovementsResponse } from '../../common/http_api/improvements';
import type { ProposedImprovement } from '../../common/http_api/improvements_output_schema';
import { proposedImprovementSchema } from '../../common/http_api/improvements_output_schema';
import { InvalidImprovementError } from '../improvements/errors';
import { buildImprovementId } from '../improvements/identity';
import { isProposable, toProposal } from '../improvements/propose';
import type { ProposalsProvider, ProposalsProviderContext } from '../proposals/provider';

export interface RecordImprovementsOptions {
  aiIndexId: string;
  spaceId: string;
  /** The workflow execution that produced the proposals. */
  agentRunId: string;
  signalWindow: { from: string; to: string };
  signalSpaces: string[];
  /** The actions the AI index permits; an empty list is observe-only. */
  allowedActions: ImprovementAction[];
  /** Straight off the agent, unvalidated. */
  proposals: unknown[];
  /** Where an improvement is put up for review. */
  review: {
    provider: ProposalsProvider;
    context: ProposalsProviderContext;
    logger: Logger;
  };
}

interface Candidate {
  improvementId: string;
  proposal: ProposedImprovement;
}

const missingRequiredField = (proposal: ProposedImprovement): string | undefined => {
  const { action, payload } = proposal;
  if (action === 'add_ki' && !payload?.ki) return 'payload.ki';
  if (action === 'edit_ki' && (!payload?.ki_patch || Object.keys(payload.ki_patch).length === 0))
    return 'payload.ki_patch';
  if ((action === 'add_workflow' || action === 'edit_workflow') && !payload?.workflow_yaml)
    return 'payload.workflow_yaml';
  if ((action === 'add_source' || action === 'edit_source') && !payload?.source)
    return 'payload.source';
  return undefined;
};

const describe = (proposal: unknown): { action?: string; title?: string } => {
  if (typeof proposal !== 'object' || proposal === null) {
    return {};
  }
  const { action, title } = proposal as { action?: unknown; title?: unknown };
  return {
    ...(typeof action === 'string' ? { action } : {}),
    ...(typeof title === 'string' ? { title } : {}),
  };
};

/** Puts what an analysis run proposed up for review, as one proposal per change. */
export const recordImprovements = async ({
  aiIndexId,
  spaceId,
  agentRunId,
  signalWindow,
  signalSpaces,
  allowedActions,
  proposals,
  review,
}: RecordImprovementsOptions): Promise<RecordImprovementsResponse> => {
  const skipped: RecordImprovementsResponse['skipped'] = [];
  const candidates: Candidate[] = [];
  const seen = new Set<string>();
  const allowed = new Set<ImprovementAction>(allowedActions);

  for (const raw of proposals) {
    if (candidates.length >= MAX_IMPROVEMENTS_PER_RUN) {
      skipped.push({
        ...describe(raw),
        reason: 'limit_exceeded',
        detail: `A run may record at most ${MAX_IMPROVEMENTS_PER_RUN} improvements.`,
      });
      continue;
    }

    const parsed = proposedImprovementSchema.safeParse(raw);
    if (!parsed.success) {
      skipped.push({
        ...describe(raw),
        reason: 'invalid',
        detail: parsed.error.issues
          .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
          .join('; '),
      });
      continue;
    }

    const proposal = parsed.data;

    const missing = missingRequiredField(proposal);
    if (missing) {
      skipped.push({
        action: proposal.action,
        title: proposal.title,
        reason: 'invalid',
        detail: `The ${proposal.action} proposal is missing ${missing}.`,
      });
      continue;
    }

    if (!isProposable(proposal.action)) {
      skipped.push({
        action: proposal.action,
        title: proposal.title,
        reason: 'action_not_allowed',
        detail: `'${proposal.action}' cannot be reviewed as a proposal yet, so it is not recorded.`,
      });
      continue;
    }

    if (!allowed.has(proposal.action)) {
      skipped.push({
        action: proposal.action,
        title: proposal.title,
        reason: 'action_not_allowed',
        detail:
          allowedActions.length === 0
            ? 'This AI index is configured for observation only and records no improvements.'
            : `'${proposal.action}' is not permitted on this AI index.`,
      });
      continue;
    }

    let improvementId: string;
    try {
      improvementId = buildImprovementId({
        aiIndexId,
        spaceId,
        action: proposal.action,
        target: proposal.target,
      });
    } catch (error) {
      if (!(error instanceof InvalidImprovementError)) {
        throw error;
      }
      skipped.push({
        action: proposal.action,
        title: proposal.title,
        reason: 'invalid',
        detail: error.message,
      });
      continue;
    }

    if (seen.has(improvementId)) {
      skipped.push({
        action: proposal.action,
        title: proposal.title,
        reason: 'duplicate',
        detail: 'Another proposal in this run describes the same change.',
      });
      continue;
    }
    seen.add(improvementId);

    candidates.push({ improvementId, proposal });
  }

  const recorded: RecordImprovementsResponse['recorded'] = [];
  for (const { improvementId, proposal } of candidates) {
    const change = toProposal({
      improvementId,
      aiIndexId,
      proposal,
      provenance: {
        agent_run_id: agentRunId,
        signal_ids: proposal.signal_ids ?? [],
        signal_spaces: signalSpaces,
        signal_window: signalWindow,
        signal_count: proposal.signal_ids?.length ?? 0,
        ...(proposal.signal_tags ? { tags: proposal.signal_tags } : {}),
      },
    });
    if (!change) {
      continue;
    }
    try {
      const created = await review.provider.create({ ...review.context, proposal: change });
      if (!created) {
        skipped.push({
          action: proposal.action,
          title: proposal.title,
          reason: 'duplicate',
          detail:
            'This change was already proposed, and it is either awaiting review or has been decided.',
        });
        continue;
      }
      recorded.push({
        improvement_id: improvementId,
        action: proposal.action,
        title: proposal.title,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      review.logger.warn(`Could not propose improvement [${improvementId}] for review: ${detail}`);
      skipped.push({
        action: proposal.action,
        title: proposal.title,
        reason: 'proposal_failed',
        detail: `It could not be put up for review: ${detail}`,
      });
    }
  }

  return { recorded, skipped };
};
