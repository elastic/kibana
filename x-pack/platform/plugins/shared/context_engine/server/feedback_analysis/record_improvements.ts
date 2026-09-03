/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_IMPROVEMENTS_PER_RUN } from '../../common/constants';
import type { ImprovementAction } from '../../common/http_api/improvement_actions';
import type {
  ImprovementRevisionInput,
  RecordImprovementsResponse,
} from '../../common/http_api/improvements';
import type { ProposedImprovement } from '../../common/http_api/improvements_output_schema';
import { proposedImprovementSchema } from '../../common/http_api/improvements_output_schema';
import { InvalidImprovementError } from '../improvements/errors';
import { buildImprovementId } from '../improvements/identity';
import type { ImprovementsServiceApi } from '../improvements/service';

export interface RecordImprovementsOptions {
  aiIndexId: string;
  agentRunId: string;
  signalWindow: { from: string; to: string };
  signalSpaces: string[];
  /** The AI index's policy. An empty list is observe-only and rejects everything. */
  allowedActions: ImprovementAction[];
  /** Straight off the agent, unvalidated. */
  proposals: unknown[];
  improvementsService: ImprovementsServiceApi;
  suggestedAt?: string;
}

interface Candidate {
  improvementId: string;
  proposal: ProposedImprovement;
  input: ImprovementRevisionInput;
}

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

/**
 * Turns what an analysis run proposed into revisions of the improvements store.
 *
 * The run is not trusted with any of it. The action is checked against the index's policy, the
 * shape against the step contracts, and the identity is derived here — a run that could name its
 * own `improvement_id` could merge two unrelated proposals or fork one problem across many, and
 * the store's idempotency would stop meaning anything.
 *
 * Nothing here throws for a bad proposal. A run is unattended, and failing the whole batch because
 * one of eight proposals named a missing `ki_id` would throw away seven good ones and give the run
 * nothing to report. Every rejection comes back as a `skipped` entry with a reason instead.
 */
export const recordImprovements = async ({
  aiIndexId,
  agentRunId,
  signalWindow,
  signalSpaces,
  allowedActions,
  proposals,
  improvementsService,
  suggestedAt,
}: RecordImprovementsOptions): Promise<RecordImprovementsResponse> => {
  const skipped: RecordImprovementsResponse['skipped'] = [];
  const candidates: Candidate[] = [];
  const seen = new Set<string>();
  const allowed = new Set<ImprovementAction>(allowedActions);

  for (const raw of proposals) {
    // Bounded by what has been accepted, not by position in the input: a run that proposed thirty
    // things of which the first ten were malformed still has room for twenty good ones.
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

    // Checked here as well as in the schema the agent was given. The schema stops a compliant
    // model from expressing the action at all; this stops everything else, including a run whose
    // policy changed between being briefed and answering.
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

    // Two proposals that fingerprint the same are the same fix described twice. The store would
    // keep only one anyway; saying so is more useful to the run than silently dropping it.
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

    candidates.push({
      improvementId,
      proposal,
      input: {
        improvement_id: improvementId,
        ai_index_id: aiIndexId,
        status: 'suggested',
        ...(suggestedAt ? { suggested_at: suggestedAt } : {}),
        title: proposal.title,
        rationale: proposal.rationale,
        action: proposal.action,
        ...(proposal.target ? { target: proposal.target } : {}),
        payload: proposal.payload ?? {},
        provenance: {
          agent_run_id: agentRunId,
          signal_ids: proposal.signal_ids,
          signal_spaces: signalSpaces,
          signal_window: signalWindow,
          // The signals the proposal cites, not the size of the group behind it: the run is handed
          // a capped sample of ids per group, so this is the evidence that can actually be opened.
          signal_count: proposal.signal_ids.length,
          ...(proposal.signal_tags ? { tags: proposal.signal_tags } : {}),
        },
      },
    });
  }

  const written = await improvementsService.write(candidates.map(({ input }) => input));
  const writtenIds = new Set(written.map(({ improvement_id: id }) => id));

  const recorded: RecordImprovementsResponse['recorded'] = [];
  for (const candidate of candidates) {
    if (writtenIds.has(candidate.improvementId)) {
      recorded.push({
        improvement_id: candidate.improvementId,
        action: candidate.proposal.action,
        title: candidate.proposal.title,
      });
      continue;
    }
    skipped.push({
      action: candidate.proposal.action,
      title: candidate.proposal.title,
      reason: 'conflict',
      detail:
        'Another writer changed this improvement while the run was in flight; it was left as it stands.',
    });
  }

  return { recorded, skipped };
};
