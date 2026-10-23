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

/** Every full date and time in the proposal UI, from an ISO 8601 timestamp: "20 Oct 2026, 14:36". */
export const formatDateTime = (iso: string): string => moment(iso).format(DATE_TIME_FORMAT);

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
      ? [impactCaptionPart(proposal)].map((text) => (text === undefined ? undefined : { text }))
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
 * Set `includeRiskDetails` to add the impact. Use it for one proposal,
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
  const knownActorName = proposal.decidedBy?.fullName ?? proposal.decidedBy?.username;
  const actorName = proposal.decision
    ? knownActorName ??
      (proposal.decision === 'approved'
        ? APPROVAL_MODAL_TRANSLATIONS.unknownActorFallback
        : APPROVAL_MODAL_TRANSLATIONS.unknownDeclinerFallback)
    : undefined;
  const status = approvedStatusFor(proposal);
  return {
    status,
    actorName,
    isActorUnknown: proposal.decision !== undefined && knownActorName === undefined,
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
 * Whether the proposal's own deadline is in the past. A proposal can be settled as expired before
 * it — the workflow failed or ran out of attempts — so "expired" alone does not mean it timed out.
 * `false` when there is no deadline to compare against.
 */
export const hasDeadlinePassed = (proposal: Pick<ApprovalProposal, 'expiresAt'>): boolean =>
  proposal.expiresAt !== undefined && new Date(proposal.expiresAt).getTime() <= Date.now();

/** How close a deadline has to be for the modal to warn about it. */
export const EXPIRES_SOON_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Whether a deadline is still ahead but no more than a day away. */
export const isExpiringSoon = (proposal: Pick<ApprovalProposal, 'expiresAt'>): boolean => {
  if (proposal.expiresAt === undefined) {
    return false;
  }
  const remaining = new Date(proposal.expiresAt).getTime() - Date.now();
  return remaining > 0 && remaining <= EXPIRES_SOON_WINDOW_MS;
};

/** Replaced by a newer proposal, by a retry or a revision. */
export const isProposalReplaced = (proposal: ApprovalProposal): boolean =>
  proposal.supersededBy !== undefined || proposal.status === 'superseded';

/** A to-do marked as applied, then as not applied: a successor is offered and this one is void. */
const isUnappliedTodo = (proposal: ApprovalProposal): boolean =>
  isProposalReplaced(proposal) &&
  isTodoProposal(proposal) &&
  proposal.decision === 'approved' &&
  proposal.status === 'no_action';

/**
 * `status: 'expired'` is the workflow's reliable settlement for an unanswered proposal (on
 * attempt exhaustion, or a failure) before the deadline itself passes. A deadline that has passed
 * but not yet been swept to this status still reads `pending` here; that lag is accepted rather
 * than compared against `expiresAt` directly.
 *
 * A replaced proposal nobody ever decided reads as expired too: it can no longer be actioned, and
 * "expired" is how the UI already says that. One that was decided keeps its own outcome, except
 * a to-do that was marked as applied and then not applied.
 */
export const isProposalExpired = (proposal: ApprovalProposal): boolean =>
  proposal.status === 'expired' ||
  (isProposalReplaced(proposal) && (!proposal.decision || isUnappliedTodo(proposal)));

/**
 * Why a proposal that can no longer be decided is in that state, as the flyout row captions it and
 * the modal's callout repeats it: replaced by a newer proposal, else the gate's own saved reason,
 * else that nobody decided in time. A proposal settled before its deadline (a failed workflow, say)
 * did not time out, so it gets the generic wording instead of claiming one.
 */
export const getExpiredCaption = (proposal: ApprovalProposal): string => {
  if (isProposalReplaced(proposal)) {
    return APPROVAL_MODAL_TRANSLATIONS.outdatedCaption;
  }
  if (proposal.rationale) {
    return proposal.rationale;
  }
  return proposal.expiresAt && !hasDeadlinePassed(proposal)
    ? APPROVAL_MODAL_TRANSLATIONS.expiredGenericCaption
    : APPROVAL_MODAL_TRANSLATIONS.expiredTimedOutCaption;
};

/**
 * Where a proposal is right now: its recorded decision when it has one, else the host's in-flight
 * approve/decline, else still awaiting a decision. The flyout row and the modal both read it from
 * here, so they always agree on the phase.
 */
export const getProposalPhase = (
  proposal: ApprovalProposal,
  isSubmitting?: 'applying' | 'declining'
): ApprovalPhase => {
  const decision = getProposalDecision(proposal);
  return decision ? decision.status : isSubmitting ?? 'pending';
};
