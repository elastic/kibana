/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LINKED_INVESTIGATIONS_LABELS = Object.freeze({
  sectionTitle: i18n.translate('xpack.alertzero.detailsFlyout.linkedInvestigations.sectionTitle', {
    defaultMessage: 'Linked investigations',
  }),
  typeBadge: i18n.translate('xpack.alertzero.detailsFlyout.linkedInvestigations.typeBadge', {
    defaultMessage: 'Investigation',
  }),
  statusOpen: i18n.translate('xpack.alertzero.detailsFlyout.linkedInvestigations.statusOpen', {
    defaultMessage: 'Open',
  }),
  statusClosed: i18n.translate('xpack.alertzero.detailsFlyout.linkedInvestigations.statusClosed', {
    defaultMessage: 'Closed',
  }),
  empty: i18n.translate('xpack.alertzero.detailsFlyout.linkedInvestigations.empty', {
    defaultMessage: 'No linked investigations',
  }),
  errorTitle: i18n.translate('xpack.alertzero.detailsFlyout.linkedInvestigations.errorTitle', {
    defaultMessage: 'Could not load linked investigations',
  }),
});

export const DETAILS_FLYOUT_LABELS = Object.freeze({
  ariaLabel: i18n.translate('xpack.alertzero.detailsFlyout.ariaLabel', {
    defaultMessage: 'Conversation details',
  }),
  tabs: {
    overview: i18n.translate('xpack.alertzero.detailsFlyout.tabs.overview', {
      defaultMessage: 'Overview',
    }),
  },
  sections: {
    overview: i18n.translate('xpack.alertzero.detailsFlyout.sections.situation', {
      defaultMessage: "What's happened",
    }),
    conclusion: i18n.translate('xpack.alertzero.detailsFlyout.sections.conclusion', {
      defaultMessage: 'Conclusion',
    }),
    parentInvestigation: i18n.translate(
      'xpack.alertzero.detailsFlyout.sections.parentInvestigation',
      {
        defaultMessage: 'Parent investigation',
      }
    ),
  },
  overview: {
    showMore: i18n.translate('xpack.alertzero.detailsFlyout.overview.showMore', {
      defaultMessage: 'Show more',
    }),
    showLess: i18n.translate('xpack.alertzero.detailsFlyout.overview.showLess', {
      defaultMessage: 'Show less',
    }),
    triggerAlert: i18n.translate('xpack.alertzero.detailsFlyout.overview.triggerAlert', {
      defaultMessage: 'Trigger · Alert',
    }),
  },
  actions: {
    openChat: i18n.translate('xpack.alertzero.detailsFlyout.actions.openChat', {
      defaultMessage: 'Open chat',
    }),
    openCase: i18n.translate('xpack.alertzero.detailsFlyout.actions.openCase', {
      defaultMessage: 'Open a case',
    }),
    assign: i18n.translate('xpack.alertzero.detailsFlyout.actions.assign', {
      defaultMessage: 'Assign',
    }),
    dismiss: i18n.translate('xpack.alertzero.detailsFlyout.actions.dismiss', {
      defaultMessage: 'Dismiss',
    }),
  },
});
