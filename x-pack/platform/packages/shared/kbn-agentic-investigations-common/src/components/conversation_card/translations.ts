/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CONVERSATION_CARD_LABELS = Object.freeze({
  templateTypes: {
    investigation: i18n.translate('xpack.alertzero.conversationCard.templateTypes.investigation', {
      defaultMessage: 'Investigation',
    }),
    incident: i18n.translate('xpack.alertzero.conversationCard.templateTypes.incident', {
      defaultMessage: 'Incident',
    }),
  },
  watchedBy: i18n.translate('xpack.alertzero.conversationCard.watchedBy', {
    defaultMessage: 'Watched by',
  }),
  inMotion: i18n.translate('xpack.alertzero.conversationCard.inMotion', {
    defaultMessage: 'In motion',
  }),
  pendingProposals: (count: number) =>
    i18n.translate('xpack.alertzero.conversationCard.pendingProposals', {
      defaultMessage: '{count, plural, one {# pending proposal} other {# pending proposals}}',
      values: { count },
    }),
});

export const CONVERSATION_CARD_ACTIONS = Object.freeze({
  default: i18n.translate('xpack.alertzero.conversationCard.defaultAction', {
    defaultMessage: 'Review',
  }),
  viewDetails: i18n.translate('xpack.alertzero.conversationCard.viewDetails', {
    defaultMessage: 'View details',
  }),
});

export const WATCH_TIER_LABELS = Object.freeze({
  officer: i18n.translate('xpack.alertzero.conversationCard.watchTier.officer', {
    defaultMessage: 'Watch Officer',
  }),
  dark: i18n.translate('xpack.alertzero.conversationCard.watchTier.dark', {
    defaultMessage: 'Dark Watch',
  }),
  deep: i18n.translate('xpack.alertzero.conversationCard.watchTier.deep', {
    defaultMessage: 'Deep Watch',
  }),
  detection: i18n.translate('xpack.alertzero.brief.watchTier.detection', {
    defaultMessage: 'Detection Watch',
  }),
  floor: i18n.translate('xpack.alertzero.brief.watchTier.floor', {
    defaultMessage: 'Watch Floor',
  }),
});
