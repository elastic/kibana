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
  reversible: i18n.translate('xpack.alertzero.approvalModal.caption.reversible', {
    defaultMessage: 'Reversible',
  }),
  irreversible: i18n.translate('xpack.alertzero.approvalModal.caption.irreversible', {
    defaultMessage: 'Irreversible',
  }),
  appliedBannerTitle: i18n.translate('xpack.alertzero.approvalModal.outcome.appliedTitle', {
    defaultMessage: 'Applied successfully',
  }),
  declinedBannerTitle: i18n.translate('xpack.alertzero.approvalModal.outcome.declinedTitle', {
    defaultMessage: 'Declined',
  }),
  applyingBannerTitle: i18n.translate('xpack.alertzero.approvalModal.outcome.applyingTitle', {
    defaultMessage: 'Applying',
  }),
  decliningBannerTitle: i18n.translate('xpack.alertzero.approvalModal.outcome.decliningTitle', {
    defaultMessage: 'Declining',
  }),
  inProgressHint: i18n.translate('xpack.alertzero.approvalModal.outcome.inProgressHint', {
    defaultMessage: 'Typically takes 3-5 minutes.',
  }),
  actionErrorTitle: i18n.translate('xpack.alertzero.approvalModal.outcome.actionError', {
    defaultMessage: 'Could not record the decision. Try again.',
  }),
  currentActorFallback: i18n.translate('xpack.alertzero.approvalModal.outcome.currentActor', {
    defaultMessage: 'You',
  }),
});
