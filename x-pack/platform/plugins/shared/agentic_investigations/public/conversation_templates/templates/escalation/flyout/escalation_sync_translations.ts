/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ESCALATION_SYNC_TRANSLATIONS = Object.freeze({
  syncing: i18n.translate('xpack.agenticInvestigations.escalationSync.syncing', {
    defaultMessage: 'Syncing attachments from linked investigations',
  }),
  updated: (count: number) =>
    i18n.translate('xpack.agenticInvestigations.escalationSync.updated', {
      defaultMessage:
        '{count, plural, one {# attachment was} other {# attachments were}} added from linked investigations',
      values: { count },
    }),
  failureTitle: i18n.translate('xpack.agenticInvestigations.escalationSync.failureTitle', {
    defaultMessage: 'Failed to sync attachments',
  }),
  failure: i18n.translate('xpack.agenticInvestigations.escalationSync.failure', {
    defaultMessage: 'The escalation could not be synced with its linked investigations.',
  }),
  partialFailureTitle: i18n.translate(
    'xpack.agenticInvestigations.escalationSync.partialFailureTitle',
    { defaultMessage: 'Some attachments could not be synced' }
  ),
  partialFailure: (count: number) =>
    i18n.translate('xpack.agenticInvestigations.escalationSync.partialFailure', {
      defaultMessage:
        '{count, plural, one {# attachment} other {# attachments}} could not be copied from linked investigations.',
      values: { count },
    }),
});
