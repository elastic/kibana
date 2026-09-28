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
  noAction: i18n.translate('xpack.proposals.approvalModal.noAction', {
    defaultMessage: 'No automated action',
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
  expiredCaption: i18n.translate('xpack.proposals.approvalModal.caption.expired', {
    defaultMessage: 'Expired',
  }),
  appliedBannerTitle: i18n.translate('xpack.proposals.approvalModal.outcome.appliedTitle', {
    defaultMessage: 'Applied successfully',
  }),
  declinedBannerTitle: i18n.translate('xpack.proposals.approvalModal.outcome.declinedTitle', {
    defaultMessage: 'Declined',
  }),
  applyingBannerTitle: i18n.translate('xpack.proposals.approvalModal.outcome.applyingTitle', {
    defaultMessage: 'Applying',
  }),
  decliningBannerTitle: i18n.translate('xpack.proposals.approvalModal.outcome.decliningTitle', {
    defaultMessage: 'Declining',
  }),
  failedBannerTitle: i18n.translate('xpack.proposals.approvalModal.outcome.failedTitle', {
    defaultMessage: 'Action failed',
  }),
  noActionBannerTitle: i18n.translate('xpack.proposals.approvalModal.outcome.noActionTitle', {
    defaultMessage: 'Approved — no action to run',
  }),
  inProgressHint: i18n.translate('xpack.proposals.approvalModal.outcome.inProgressHint', {
    defaultMessage: 'Typically takes 3-5 minutes.',
  }),
  actionErrorTitle: i18n.translate('xpack.proposals.approvalModal.outcome.actionError', {
    defaultMessage: 'Could not record the decision. Try again.',
  }),
  currentActorFallback: i18n.translate('xpack.proposals.approvalModal.outcome.currentActor', {
    defaultMessage: 'You',
  }),
  unknownActorFallback: i18n.translate('xpack.proposals.approvalModal.outcome.unknownActor', {
    defaultMessage: 'Someone',
  }),
});
