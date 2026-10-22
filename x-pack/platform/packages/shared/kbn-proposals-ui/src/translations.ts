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
  expiredBadge: i18n.translate('xpack.proposals.approvalModal.expiredBadge', {
    defaultMessage: 'Expired',
  }),
  approvingBadge: i18n.translate('xpack.proposals.approvalModal.approvingBadge', {
    defaultMessage: 'Approving',
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
  approvingBannerTitle: i18n.translate('xpack.proposals.approvalModal.outcome.approvingTitle', {
    defaultMessage: 'Approving',
  }),
  applyingBannerTitle: i18n.translate('xpack.proposals.approvalModal.outcome.applyingTitle', {
    defaultMessage: 'Applying',
  }),
  approvingBannerDescription: i18n.translate(
    'xpack.proposals.approvalModal.outcome.approvingDescription',
    { defaultMessage: 'Awaiting approval request to return' }
  ),
  applyingBannerDescription: i18n.translate(
    'xpack.proposals.approvalModal.outcome.applyingDescription',
    { defaultMessage: 'Might take several minutes' }
  ),
  decliningBannerTitle: i18n.translate('xpack.proposals.approvalModal.outcome.decliningTitle', {
    defaultMessage: 'Declining',
  }),
  failedBannerTitle: i18n.translate('xpack.proposals.approvalModal.outcome.failedTitle', {
    defaultMessage: 'Failed',
  }),
  noActionBannerTitle: i18n.translate('xpack.proposals.approvalModal.outcome.noActionTitle', {
    defaultMessage: 'Approved',
  }),
  actionErrorTitle: i18n.translate('xpack.proposals.approvalModal.outcome.actionError', {
    defaultMessage: 'Could not record the decision. Try again.',
  }),
  currentActorFallback: i18n.translate('xpack.proposals.approvalModal.outcome.currentActor', {
    defaultMessage: 'You',
  }),
  unknownActorFallback: i18n.translate('xpack.proposals.approvalModal.outcome.unknownActor', {
    defaultMessage: 'Approver is unknown',
  }),
  unknownDeclinerFallback: i18n.translate('xpack.proposals.approvalModal.outcome.unknownDecliner', {
    defaultMessage: 'Decliner is unknown',
  }),
  previousFailureCalloutTitle: i18n.translate(
    'xpack.proposals.approvalModal.previousFailureCallout',
    { defaultMessage: 'Failed' }
  ),
  previousFailureCalloutBody: (error: string) =>
    i18n.translate('xpack.proposals.approvalModal.previousFailureCalloutBody', {
      defaultMessage: 'Previous attempt failed: {error}. Try one more time',
      // The reason often ends in a full stop of its own.
      values: { error: error.trim().replace(/[.\s]+$/, '') },
    }),
  // Deliberately silent on *why* it expired: `isProposalExpired` is true both once the deadline
  // passes and when the workflow settles a proposal as `status: 'expired'` beforehand (e.g. after
  // exhausting its retry attempts), and this wording has to be true for either cause.
  restrictedCalloutTitle: i18n.translate('xpack.proposals.approvalModal.restrictedCalloutTitle', {
    defaultMessage: 'Restricted',
  }),
  restrictedCalloutBody: i18n.translate('xpack.proposals.approvalModal.restrictedCalloutBody', {
    defaultMessage: "You don't have permissions to act on this proposal",
  }),
  replacedCalloutTitle: i18n.translate('xpack.proposals.approvalModal.replacedCallout', {
    defaultMessage: 'Replaced',
  }),
  replacedCalloutDescription: i18n.translate(
    'xpack.proposals.approvalModal.replacedCalloutDescription',
    {
      defaultMessage: 'This proposal was replaced by a newer one and can no longer be actioned.',
    }
  ),
  expiredCalloutTitle: i18n.translate('xpack.proposals.approvalModal.expiredCallout', {
    defaultMessage: 'Expired',
  }),
  expiresCalloutTitle: (deadline: string) =>
    i18n.translate('xpack.proposals.approvalModal.expiresCallout', {
      defaultMessage: 'Expires on {deadline}',
      values: { deadline },
    }),
  expiredCalloutTitleOn: (deadline: string) =>
    i18n.translate('xpack.proposals.approvalModal.expiredCalloutOn', {
      defaultMessage: 'Expired on {deadline}',
      values: { deadline },
    }),
  expiredCalloutDescriptionWithReason: (reason: string) =>
    i18n.translate('xpack.proposals.approvalModal.expiredCalloutDescriptionWithReason', {
      defaultMessage: 'This proposal can no longer be actioned. {reason}',
      values: { reason },
    }),
  expiredCalloutDescription: i18n.translate(
    'xpack.proposals.approvalModal.expiredCalloutDescription',
    {
      defaultMessage: "This proposal wasn't decided in time and can no longer be actioned.",
    }
  ),
});
