/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ApprovalProposal } from './types';
import type { ApprovalDecision } from './approval_content';
import type { ApprovalPhase } from './approval_outcome';
import { APPROVAL_MODAL_TRANSLATIONS } from './translations';
import { formatDismissReason } from './dismiss_reason';

/** Stored lowercase (`configure`, `respond`, ...); the caption reads it in sentence case. */
const toSentenceCase = (value: string): string =>
  value.length > 0 ? `${value[0].toUpperCase()}${value.slice(1)}` : value;

const impactCaptionPart = (proposal: ApprovalProposal): string | undefined => {
  const impact = proposal.impact ?? proposal.action?.impact;
  return impact === undefined
    ? undefined
    : i18n.translate('xpack.proposals.approvalModal.caption.impact', {
        defaultMessage: '{impact} impact',
        values: { impact: toSentenceCase(impact) },
      });
};

/** `undefined` proposals carry no deadline at all — as opposed to one already past. */
const deadlineCaptionPart = (proposal: ApprovalProposal): string | undefined => {
  if (!proposal.expiresAt) {
    return undefined;
  }
  if (isProposalExpired(proposal)) {
    return APPROVAL_MODAL_TRANSLATIONS.expiredCaption;
  }
  const deadline = new Date(proposal.expiresAt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  return i18n.translate('xpack.proposals.approvalModal.caption.expires', {
    defaultMessage: 'Expires {deadline}',
    values: { deadline },
  });
};

/**
 * The category/reversibility line shown under a proposal's title — in the modal header and the
 * flyout's `ProposedActionButton` row alike, so the two describe the same proposal identically.
 * `undefined` when the proposal carries neither, so a caller can skip the line rather than render
 * an empty one.
 *
 * `includeRiskDetails` adds impact and the decision deadline — the same risk context the modal
 * used to show as its own list section before this became one caption line. Opt-in rather than
 * always on: a whole list of flyout rows repeating both on every line would be noisier than
 * useful, where the one proposal a modal (or the chat card) is actually asking about has the room
 * for it and the analyst needs it to actually decide.
 */
export const getProposalCaption = (
  proposal: ApprovalProposal,
  { includeRiskDetails = false }: { includeRiskDetails?: boolean } = {}
): string | undefined => {
  const category = proposal.action?.category ?? proposal.category;
  const reversible = proposal.action?.reversible;
  const parts = [
    category === undefined ? undefined : toSentenceCase(category),
    reversible === undefined
      ? undefined
      : reversible
      ? APPROVAL_MODAL_TRANSLATIONS.reversible
      : APPROVAL_MODAL_TRANSLATIONS.irreversible,
    ...(includeRiskDetails ? [impactCaptionPart(proposal), deadlineCaptionPart(proposal)] : []),
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(' • ') : undefined;
};

/**
 * The read-only decision `ApprovalContent` renders in place of its Approve/Decline buttons.
 * `undefined` only while a proposal is genuinely still awaiting one: a proposal can reach a
 * terminal state — expired, chiefly — without a `decision` ever being made, so `!proposal.decision`
 * alone is not sufficient to mean "pending". Missing `decidedBy`/`decidedAt` is not a reason to hide
 * a real decision: `decidedBy` can be genuinely absent (no resolvable identity), in which case a
 * fallback name still names *someone* rather than reverting to "awaiting a decision" for a proposal
 * that plainly is not. `decidedAt` is passed through as-is rather than defaulted to now — inventing
 * a timestamp would read as real audit attribution and would keep changing on every reopen;
 * `ApprovalActorTime` renders the actor alone when it is absent. `actorName` itself is left
 * `undefined` when nobody actually decided (expiry is a timeout, not a decision by anyone), so a
 * caller falls back to its own plain caption rather than rendering a fabricated "by Unknown".
 */
export const getProposalDecision = (proposal: ApprovalProposal): ApprovalDecision | undefined => {
  if (!proposal.decision && !isProposalExpired(proposal)) {
    return undefined;
  }
  const actorName = proposal.decision
    ? proposal.decidedBy?.fullName ??
      proposal.decidedBy?.username ??
      APPROVAL_MODAL_TRANSLATIONS.unknownActorFallback
    : undefined;
  const status = approvedStatusFor(proposal);
  return {
    status,
    actorName,
    decidedAt: proposal.decidedAt,
    // A failed action reports why it failed, so the analyst is not left with "Action failed"
    // alone. A decline's reason is structured (`dismissReason`), with the free-text rationale
    // folded in when the decliner left one; an approval has no `dismissReason` at all, so it
    // falls back to `rationale` alone.
    reason:
      status === 'failed' && proposal.executionError
        ? proposal.executionError
        : proposal.dismissReason
        ? formatDismissReason(proposal.dismissReason, proposal.rationale)
        : proposal.rationale,
  };
};

/**
 * Expiry is checked first because it is orthogonal to the approved/declined axis below: a proposal
 * whose gate timed out never received a `decision` at all, so `proposal.decision !== 'approved'`
 * would otherwise read it as declined — an outcome nobody chose.
 *
 * Approving only resumes the gate workflow — the action it starts still runs afterward, so a
 * `decision: 'approved'` proposal can read back `executing` or `failed` as well as `succeeded`.
 * Declining has no action to run, so it settles as soon as it is decided — `no_action` covers
 * that case too, but `'declined'` (the branch below) already accounts for every non-approved
 * decision regardless of status, so this only ever sees `no_action` for an *approved* proposal
 * that simply carried no action to run — a distinct outcome from `'applied'`, which claims one
 * ran and succeeded.
 */
const approvedStatusFor = (proposal: ApprovalProposal): Exclude<ApprovalPhase, 'pending'> => {
  if (isProposalExpired(proposal)) {
    return 'expired';
  }
  if (proposal.decision !== 'approved') {
    return 'declined';
  }
  if (proposal.status === 'failed') {
    return 'failed';
  }
  if (proposal.status === 'pending' || proposal.status === 'executing') {
    return 'applying';
  }
  if (proposal.status === 'no_action') {
    return 'no_action';
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
