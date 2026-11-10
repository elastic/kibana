/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const APPROVAL_MODAL_TRANSLATIONS = Object.freeze({
  approve: i18n.translate('xpack.proposals.approvalModal.approve', {
    defaultMessage: 'Approve',
  }),
  /** To-do primary: analyst confirms they carried it out. */
  markApplied: i18n.translate('xpack.proposals.approvalModal.markApplied', {
    defaultMessage: 'Mark as applied',
  }),
  /** Re-offers a marked-applied to-do. */
  markNotApplied: i18n.translate('xpack.proposals.approvalModal.markNotApplied', {
    defaultMessage: 'Mark as not applied',
  }),
  dismiss: i18n.translate('xpack.proposals.approvalModal.dismiss', {
    defaultMessage: 'Decline',
  }),
  cancelDecline: i18n.translate('xpack.proposals.approvalModal.cancelDecline', {
    defaultMessage: 'Cancel',
  }),
  modalAriaLabel: i18n.translate('xpack.proposals.approvalModal.ariaLabel', {
    defaultMessage: 'Approval required modal',
  }),
  alwaysAllowAriaLabel: i18n.translate('xpack.proposals.approvalModal.alwaysAllow.ariaLabel', {
    defaultMessage: 'Always allow this action',
  }),
  needsReviewBadge: i18n.translate('xpack.proposals.approvalModal.needsReviewBadge', {
    defaultMessage: 'Needs review',
  }),
  appliedBadge: i18n.translate('xpack.proposals.approvalModal.appliedBadge', {
    defaultMessage: 'Applied',
  }),
  declinedBadge: i18n.translate('xpack.proposals.approvalModal.declinedBadge', {
    defaultMessage: 'Declined',
  }),
  failedBadge: i18n.translate('xpack.proposals.approvalModal.failedBadge', {
    defaultMessage: 'Failed',
  }),
  /**
   * Distinct from `appliedBadge`: an approved proposal that carries no action never runs
   * anything, so labeling it "Applied" would claim an automated action succeeded when none
   * was ever going to happen.
   */
  noActionBadge: i18n.translate('xpack.proposals.approvalModal.noActionBadge', {
    defaultMessage: 'Approved',
  }),
  /** To-do the analyst marked as applied (nothing automated ran). */
  markedAppliedBadge: i18n.translate('xpack.proposals.approvalModal.markedAppliedBadge', {
    defaultMessage: 'Applied',
  }),
  expiredBadge: i18n.translate('xpack.proposals.approvalModal.expiredBadge', {
    defaultMessage: 'Expired',
  }),
  applyingBadge: i18n.translate('xpack.proposals.approvalModal.applyingBadge', {
    defaultMessage: 'Applying',
  }),
  decliningBadge: i18n.translate('xpack.proposals.approvalModal.decliningBadge', {
    defaultMessage: 'Declining',
  }),
  reversible: i18n.translate('xpack.proposals.approvalModal.caption.reversible', {
    defaultMessage: 'Reversible',
  }),
  irreversible: i18n.translate('xpack.proposals.approvalModal.caption.irreversible', {
    defaultMessage: 'Irreversible',
  }),
  appliedBannerTitle: i18n.translate('xpack.proposals.approvalModal.outcome.appliedTitle', {
    defaultMessage: 'Applied',
  }),
  declinedBannerTitle: i18n.translate('xpack.proposals.approvalModal.outcome.declinedTitle', {
    defaultMessage: 'Declined',
  }),
  applyingBannerTitle: i18n.translate('xpack.proposals.approvalModal.outcome.applyingTitle', {
    defaultMessage: 'Applying',
  }),
  /** The detail after an outcome banner's title: who asked or decided, and when if known. */
  whoAndWhenBannerDescription: (name: string, time?: string) =>
    time
      ? i18n.translate('xpack.proposals.approvalModal.outcome.whoAndWhenDescription', {
          defaultMessage: '{name} on {time}',
          values: { name, time },
        })
      : name,
  decliningBannerTitle: i18n.translate('xpack.proposals.approvalModal.outcome.decliningTitle', {
    defaultMessage: 'Declining',
  }),
  failedBannerTitle: i18n.translate('xpack.proposals.approvalModal.outcome.failedTitle', {
    defaultMessage: 'Failed',
  }),
  noActionBannerTitle: i18n.translate('xpack.proposals.approvalModal.outcome.noActionTitle', {
    defaultMessage: 'Approved',
  }),
  markedAppliedBannerTitle: i18n.translate(
    'xpack.proposals.approvalModal.outcome.markedAppliedTitle',
    { defaultMessage: 'Marked as applied' }
  ),
  /** Caption label for `todo` (avoids sentence-cased "Todo"). */
  todoCategory: i18n.translate('xpack.proposals.approvalModal.caption.todoCategory', {
    defaultMessage: 'Apply manually',
  }),
  actionErrorTitle: i18n.translate('xpack.proposals.approvalModal.outcome.actionError', {
    defaultMessage: 'Could not record the decision. Try again.',
  }),
  currentActorFallback: i18n.translate('xpack.proposals.approvalModal.outcome.currentActor', {
    defaultMessage: 'You',
  }),
  unknownActorFallback: i18n.translate('xpack.proposals.approvalModal.outcome.unknownActor', {
    defaultMessage: 'Unknown user',
  }),
  previousFailureCalloutTitle: i18n.translate(
    'xpack.proposals.approvalModal.previousFailureCallout',
    { defaultMessage: 'Previous attempt to apply this proposal failed' }
  ),
  failedAttemptCalloutTitle: i18n.translate('xpack.proposals.approvalModal.failedAttemptCallout', {
    defaultMessage: 'This attempt failed to execute the action',
  }),
  // Deliberately silent on *why* it expired: `isProposalExpired` is true both once the deadline
  // passes and when the workflow settles a proposal as `status: 'expired'` beforehand (e.g. after
  // exhausting its retry attempts), and this wording has to be true for either cause.
  expiredCalloutTitle: i18n.translate('xpack.proposals.approvalModal.expiredCallout', {
    defaultMessage: 'Expired and can no longer be applied',
  }),
});
