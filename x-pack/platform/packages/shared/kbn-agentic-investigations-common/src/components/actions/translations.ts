/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const ACTIONS_TRANSLATIONS = Object.freeze({
  popover: {
    ariaLabel: i18n.translate('xpack.alertzero.baseActions.popover.ariaLabel', {
      defaultMessage: 'Actions menu',
    }),
  },
  buttons: {
    actions: i18n.translate('xpack.alertzero.baseActions.actions', {
      defaultMessage: 'Actions',
    }),
    openInChat: i18n.translate('xpack.alertzero.baseActions.openInChat', {
      defaultMessage: 'Open in chat',
    }),
    openEscalation: i18n.translate('xpack.alertzero.baseActions.openEscalation', {
      defaultMessage: 'Open an escalation',
    }),
    attachToEscalation: i18n.translate('xpack.alertzero.baseActions.attachToEscalation', {
      defaultMessage: 'Attach to an escalation',
    }),
    copyLink: i18n.translate('xpack.alertzero.baseActions.copyLink', {
      defaultMessage: 'Copy link',
    }),
    close: i18n.translate('xpack.alertzero.baseActions.closeInvestigation', {
      defaultMessage: 'Close investigation',
    }),
  },
  tooltips: {
    linkCopied: i18n.translate('xpack.alertzero.baseActions.tooltips.linkCopied', {
      defaultMessage: 'Link copied',
    }),
    openMenu: i18n.translate('xpack.alertzero.baseActions.openMenu', {
      defaultMessage: 'Open actions menu',
    }),
    openInChat: i18n.translate('xpack.alertzero.baseActions.tooltips.openInChat', {
      defaultMessage: 'Open in chat',
    }),
  },
});
