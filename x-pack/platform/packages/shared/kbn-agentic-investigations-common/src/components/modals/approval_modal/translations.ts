/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const APPROVAL_MODAL_TRANSLATIONS = Object.freeze({
  warningLabel: i18n.translate('xpack.alertzero.approvalModal.warningLabel', {
    defaultMessage: 'APPROVAL REQUIRED',
  }),
  actionImpactTitle: i18n.translate('xpack.alertzero.approvalModal.actionImpactTitle', {
    defaultMessage: 'Impact',
  }),
  approve: i18n.translate('xpack.alertzero.approvalModal.approve', {
    defaultMessage: 'Approve',
  }),
  dismiss: i18n.translate('xpack.alertzero.approvalModal.dismiss', {
    defaultMessage: 'Dismiss',
  }),
  noAction: i18n.translate('xpack.alertzero.approvalModal.noAction', {
    defaultMessage: 'No automated action',
  }),
  modalAriaLabel: i18n.translate('xpack.alertzero.approvalModal.ariaLabel', {
    defaultMessage: 'Approval required modal',
  }),
  alwaysAllowAriaLabel: i18n.translate('xpack.alertzero.approvalModal.alwaysAllow.ariaLabel', {
    defaultMessage: 'Always allow this action',
  }),
});
