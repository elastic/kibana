/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const ACTIONS_TRANSLATIONS = Object.freeze({
  popover: {
    ariaLabel: i18n.translate('xpack.agenticInvestigations.baseActions.popover.ariaLabel', {
      defaultMessage: 'Actions menu',
    }),
  },
  buttons: {
    actions: i18n.translate('xpack.agenticInvestigations.baseActions.actions', {
      defaultMessage: 'Actions',
    }),
    openInChat: i18n.translate('xpack.agenticInvestigations.baseActions.openInChat', {
      defaultMessage: 'Open in chat',
    }),
    openEscalation: i18n.translate('xpack.agenticInvestigations.baseActions.openEscalation', {
      defaultMessage: 'Open an escalation',
    }),
    attachToEscalation: i18n.translate(
      'xpack.agenticInvestigations.baseActions.attachToEscalation',
      {
        defaultMessage: 'Attach to an escalation',
      }
    ),
    copyLink: i18n.translate('xpack.agenticInvestigations.baseActions.copyLink', {
      defaultMessage: 'Copy link',
    }),
    close: i18n.translate('xpack.agenticInvestigations.baseActions.closeInvestigation', {
      defaultMessage: 'Close investigation',
    }),
    reopen: i18n.translate('xpack.agenticInvestigations.baseActions.reopenInvestigation', {
      defaultMessage: 'Open investigation',
    }),
  },
  tooltips: {
    linkCopied: i18n.translate('xpack.agenticInvestigations.baseActions.tooltips.linkCopied', {
      defaultMessage: 'Link copied',
    }),
    openMenu: i18n.translate('xpack.agenticInvestigations.baseActions.openMenu', {
      defaultMessage: 'Open actions menu',
    }),
    openInChat: i18n.translate('xpack.agenticInvestigations.baseActions.tooltips.openInChat', {
      defaultMessage: 'Open in chat',
    }),
    proposalsAgentBuilderPrivilegeRequired: i18n.translate(
      'xpack.agenticInvestigations.baseActions.tooltips.proposalsAgentBuilderPrivilegeRequired',
      {
        defaultMessage:
          'You need the Agent Builder Kibana privilege to execute actions and view investigations or chats.',
      }
    ),
    escalationsAgentBuilderPrivilegeRequired: i18n.translate(
      'xpack.agenticInvestigations.baseActions.tooltips.escalationsAgentBuilderPrivilegeRequired',
      {
        defaultMessage:
          'You need the Agent Builder Kibana privilege to view linked investigations.',
      }
    ),
  },
});
