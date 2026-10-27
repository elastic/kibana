/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { isTodoProposal, PROPOSAL_CATEGORY_TODO } from '@kbn/proposals-common';
import type { ApprovalProposal, ApprovalDecision } from './types';
import type { ApprovalPhase } from './approval_outcome';
import { APPROVAL_MODAL_TRANSLATIONS } from './translations';
import { formatDismissReason } from './dismiss_reason';

/** The format of each full date and time in the proposal UI. The time uses 24 hours: "20 Oct 2026, 14:36". */
export const DATE_TIME_FORMAT = 'D MMM YYYY, HH:mm';

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

/** Returns `undefined` when there is no deadline. A past deadline still returns text. */
const deadlineCaptionPart = (proposal: ApprovalProposal): string | undefined => {
  if (!proposal.expiresAt) {
    return undefined;
  }
  const deadline = moment(proposal.expiresAt).format(DATE_TIME_FORMAT);
  if (isProposalExpired(proposal)) {
    return i18n.translate('xpack.proposals.approvalModal.caption.expired', {
      defaultMessage: 'Expired on {deadline}',
      values: { deadline },
    });
  }
  return i18n.translate('xpack.proposals.approvalModal.caption.expires', {
    defaultMessage: 'Expires on {deadline}',
    values: { deadline },
  });
};

export interface ProposalCaptionPart {
  text: string;
  /** True for the "Irreversible" part, which the UI highlights. */
  isIrreversible?: boolean;
}

/** Returns the parts of the caption line, in display order. See {@link getProposalCaption}. */
export const getProposalCaptionParts = (
  proposal: ApprovalProposal,
  { includeRiskDetails = false }: { includeRiskDetails?: boolean } = {}
): ProposalCaptionPart[] => {
  const category = proposal.action?.category ?? proposal.category;
  const isReversible = proposal.action?.reversible;
  const parts: Array<ProposalCaptionPart | undefined> = [
    category === undefined
      ? undefined
      : {
          text:
            category === PROPOSAL_CATEGORY_TODO
              ? APPROVAL_MODAL_TRANSLATIONS.todoCategory
              : toSentenceCase(category),
        },
    isReversible === undefined
      ? undefined
      : isReversible
      ? { text: APPROVAL_MODAL_TRANSLATIONS.reversible }
      : { text: APPROVAL_MODAL_TRANSLATIONS.irreversible, isIrreversible: true },
    ...(includeRiskDetails
      ? [impactCaptionPart(proposal), deadlineCaptionPart(proposal)].map((text) =>
          text === undefined ? undefined : { text }
        )
      : []),
  ];
  return parts.filter(
    (part): part is ProposalCaptionPart => part !== undefined && part.text !== ''
  );
};

/**
 * Returns the line under a proposal title: its category and whether it is reversible.
 * Returns `undefined` when the proposal has neither.
 *
 * Set `includeRiskDetails` to add the impact and the decision deadline. Use it for one proposal,
 * such as in the modal. Do not use it for a list of rows, because the repeated text is noisy.
 */
export const getProposalCaption = (
  proposal: ApprovalProposal,
  options: { includeRiskDetails?: boolean } = {}
): string | undefined => {
  const parts = getProposalCaptionParts(proposal, options);
  return parts.length > 0 ? parts.map(({ text }) => text).join(' • ') : undefined;
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
    // A to-do's approval is the analyst saying they carried it out, not consent to run nothing.
    return isTodoProposal(proposal) ? 'marked_applied' : 'no_action';
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
 * `status: 'expired'` is the workflow's reliable settlement for an unanswered proposal (on
 * attempt exhaustion, or a failure) before the deadline itself passes. A deadline that has passed
 * but not yet been swept to this status still reads `pending` here; that lag is accepted rather
 * than compared against `expiresAt` directly.
 */
export const isProposalExpired = (proposal: ApprovalProposal): boolean =>
  proposal.status === 'expired';
