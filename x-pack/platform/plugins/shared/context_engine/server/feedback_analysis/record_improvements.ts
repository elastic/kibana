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
  spaceId: string;
  agentRunId: string;
  signalWindow: { from: string; to: string };
  signalSpaces: string[];
  /** The actions the AI index permits; an empty list is observe-only. */
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

/**
 * Returns the name of a required payload field that the proposal is missing, or undefined when the
 * payload is complete. Mirrors the `required()` checks in `apply/index.ts` so incomplete
 * suggestions are rejected at record time rather than only when the reviewer tries to apply them.
 * Missing target fields are caught separately by `buildImprovementId`.
 */
const missingRequiredField = (proposal: ProposedImprovement): string | undefined => {
  const { action, payload } = proposal;
  if (action === 'add_ki' && !payload?.ki) return 'payload.ki';
  if (action === 'edit_ki' && !payload?.ki_patch) return 'payload.ki_patch';
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

/** Turns what an analysis run proposed into revisions of the improvements store. */
export const recordImprovements = async ({
  aiIndexId,
  spaceId,
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
          // Absent when the proposal came from reading the index rather than an observed
          // retrieval, which is the only evidence a run over a signal-less window has.
          signal_ids: proposal.signal_ids ?? [],
          signal_spaces: signalSpaces,
          signal_window: signalWindow,
          signal_count: proposal.signal_ids?.length ?? 0,
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
