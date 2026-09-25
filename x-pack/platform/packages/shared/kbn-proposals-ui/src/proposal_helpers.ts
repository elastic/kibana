/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApprovalProposal } from './types';
import type { ApprovalDecision } from './approval_content';
import type { ApprovalPhase } from './approval_outcome';
import { APPROVAL_MODAL_TRANSLATIONS } from './translations';

/**
 * Shared with anything that opens the approval decision for a proposal (the modal itself, the
 * flyout's proposed-action row), so they title it identically.
 */
export const getProposalTitle = (proposal: ApprovalProposal): string =>
  proposal.action?.name ?? proposal.actionWorkflowId ?? APPROVAL_MODAL_TRANSLATIONS.noAction;

/** Stored lowercase (`configure`, `respond`, ...); the caption reads it in sentence case. */
const toSentenceCase = (value: string): string =>
  value.length > 0 ? `${value[0].toUpperCase()}${value.slice(1)}` : value;

/**
 * The category/reversibility line shown under a proposal's title — in the modal header and the
 * flyout's `ProposedActionButton` row alike, so the two describe the same proposal identically.
 * `undefined` when the proposal carries neither, so a caller can skip the line rather than render
 * an empty one.
 */
export const getProposalCaption = (proposal: ApprovalProposal): string | undefined => {
  const category = proposal.action?.category ?? proposal.category;
  const reversible = proposal.action?.reversible;
  const parts = [
    category === undefined ? undefined : toSentenceCase(category),
    reversible === undefined
      ? undefined
      : reversible
      ? APPROVAL_MODAL_TRANSLATIONS.reversible
      : APPROVAL_MODAL_TRANSLATIONS.irreversible,
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(' • ') : undefined;
};

/**
 * The read-only decision `ApprovalContent` renders in place of its Approve/Decline buttons.
 * `undefined` only while a proposal is still awaiting one — `decision` itself is the whole
 * condition. Missing `decidedBy`/`decidedAt` is not a reason to hide a real decision: `decidedBy`
 * can be genuinely absent (no resolvable identity), in which case a fallback name still names
 * *someone* rather than reverting to "awaiting a decision" for a proposal that plainly is not.
 * `decidedAt` is passed through as-is rather than defaulted to now — inventing a timestamp would
 * read as real audit attribution and would keep changing on every reopen; `ApprovalActorTime`
 * renders the actor alone when it is absent.
 */
export const getProposalDecision = (proposal: ApprovalProposal): ApprovalDecision | undefined => {
  if (!proposal.decision) {
    return undefined;
  }
  const actorName =
    proposal.decidedBy?.fullName ??
    proposal.decidedBy?.username ??
    APPROVAL_MODAL_TRANSLATIONS.unknownActorFallback;
  return {
    status: approvedStatusFor(proposal),
    actorName,
    decidedAt: proposal.decidedAt,
    reason: proposal.rationale,
  };
};

/**
 * Approving only resumes the gate workflow — the action it starts still runs afterward, so a
 * `decision: 'approved'` proposal can read back `executing` or `failed` as well as `succeeded`.
 * Declining has no action to run, so it settles as soon as it is decided.
 */
const approvedStatusFor = (proposal: ApprovalProposal): Exclude<ApprovalPhase, 'pending'> => {
  if (proposal.decision !== 'approved') {
    return 'declined';
  }
  if (proposal.status === 'failed') {
    return 'failed';
  }
  if (proposal.status === 'pending' || proposal.status === 'executing') {
    return 'applying';
  }
  return 'applied';
};

/**
 * The row's own impact first: a revision can override it, and it is the value the queue sorts
 * by, so preferring the action's declared impact would show the impact a revision replaced.
 * The action's value is only the default for a proposal that never set one.
 */
export const getProposalTone = (proposal: ApprovalProposal): 'primary' | 'danger' => {
  const impact = proposal.impact ?? proposal.action?.impact;
  return impact === 'high' || impact === 'critical' ? 'danger' : 'primary';
};

/**
 * `expired` is the computed flag for a deadline that has passed; `status: 'expired'` is the
 * durable settlement, which the workflow can write before the deadline when no decision was
 * reached. Without both, a proposal settled early still offers a decision that would be refused.
 */
export const isProposalExpired = (proposal: ApprovalProposal): boolean =>
  proposal.expired || proposal.status === 'expired';
