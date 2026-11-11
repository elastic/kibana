/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CONVERSATION_CARD_LABELS = Object.freeze({
  watchedBy: i18n.translate('xpack.agenticInvestigations.conversationCard.watchedBy', {
    defaultMessage: 'Watched by',
  }),
  inMotion: i18n.translate('xpack.agenticInvestigations.conversationCard.inMotion', {
    defaultMessage: 'In motion',
  }),
  pendingProposals: (count: number) =>
    i18n.translate('xpack.agenticInvestigations.conversationCard.pendingProposals', {
      defaultMessage: '{count, plural, one {# pending proposal} other {# pending proposals}}',
      values: { count },
    }),
});

export const WATCH_TIER_LABELS = Object.freeze({
  officer: i18n.translate('xpack.agenticInvestigations.conversationCard.watchTier.officer', {
    defaultMessage: 'Watch Officer',
  }),
  hunt: i18n.translate('xpack.agenticInvestigations.conversationCard.watchTier.hunt', {
    defaultMessage: 'Hunt Watch',
  }),
  deep: i18n.translate('xpack.agenticInvestigations.conversationCard.watchTier.deep', {
    defaultMessage: 'Deep Watch',
  }),
  detection: i18n.translate('xpack.agenticInvestigations.brief.watchTier.detection', {
    defaultMessage: 'Detection Watch',
  }),
  floor: i18n.translate('xpack.agenticInvestigations.brief.watchTier.floor', {
    defaultMessage: 'Watch Floor',
  }),
});
