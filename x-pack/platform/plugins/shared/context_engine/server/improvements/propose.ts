/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { ImprovementEnvelope, ProposedImprovement } from '../../common/http_api/improvements';

/**
 * Turns a run's suggestions into improvement documents.
 *
 * Each id is derived from what the suggestion *does*, not from when it was proposed, so a later run
 * that proposes the same change lands on the same document instead of adding a near-duplicate for
 * the user to review twice. Two differently worded suggestions for the same change still produce
 * two ids; the agent is given the full history precisely so that it does not do that.
 */

const HASH_LENGTH = 32;

/** Collapses wording differences that do not change which suggestion this is. */
const normalize = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ');

export const buildImprovementId = ({
  aiIndexId,
  proposal,
}: {
  aiIndexId: string;
  proposal: ProposedImprovement;
}): string => {
  const identity = [
    aiIndexId,
    proposal.action,
    proposal.target_ki_id ?? '',
    proposal.target_workflow_id ?? '',
    normalize(proposal.title),
  ].join('\u0000');

  return createHash('sha256').update(identity).digest('hex').slice(0, HASH_LENGTH);
};

export const toImprovementEnvelope = ({
  aiIndexId,
  proposal,
  runId,
  suggestedAt,
}: {
  aiIndexId: string;
  proposal: ProposedImprovement;
  runId?: string;
  suggestedAt: string;
}): ImprovementEnvelope => {
  const {
    action,
    title,
    rationale,
    confidence,
    signal_tags: signalTags,
    signal_ids: signalIds,
  } = proposal;

  const target = {
    ...(proposal.target_ki_id ? { ki_id: proposal.target_ki_id } : {}),
    ...(proposal.target_workflow_id ? { workflow_id: proposal.target_workflow_id } : {}),
  };

  return {
    improvement_id: buildImprovementId({ aiIndexId, proposal }),
    ai_index_id: aiIndexId,
    status: 'proposed',
    action,
    title,
    rationale,
    ...(signalTags?.length ? { signal_tags: signalTags } : {}),
    ...(signalIds?.length ? { signal_ids: signalIds } : {}),
    ...(Object.keys(target).length > 0 ? { target } : {}),
    payload: {
      ...(proposal.ki ? { ki: proposal.ki } : {}),
      ...(proposal.workflow_yaml ? { workflow_yaml: proposal.workflow_yaml } : {}),
    },
    ...(confidence !== undefined ? { confidence } : {}),
    ...(runId ? { run_id: runId } : {}),
    suggested_at: suggestedAt,
  };
};
