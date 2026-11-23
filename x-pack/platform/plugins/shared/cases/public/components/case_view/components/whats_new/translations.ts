/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const WHATS_NEW_TITLE = i18n.translate('xpack.cases.caseView.whatsNew.title', {
  defaultMessage: 'What is new since your last visit',
});

export const ALERTS = i18n.translate('xpack.cases.caseView.whatsNew.alerts', {
  defaultMessage: 'New alerts',
});

export const COMMENTS = i18n.translate('xpack.cases.caseView.whatsNew.comments', {
  defaultMessage: 'New comments',
});

export const CHANGES = i18n.translate('xpack.cases.caseView.whatsNew.changes', {
  defaultMessage: 'Changes',
});

export const EVIDENCE = i18n.translate('xpack.cases.caseView.whatsNew.evidence', {
  defaultMessage: 'New evidence',
});

export const MARK_AS_SEEN = i18n.translate('xpack.cases.caseView.whatsNew.markAsSeen', {
  defaultMessage: 'Mark as seen',
});

export const NEW_ATTACHMENTS_ARIA = (count: number) =>
  i18n.translate('xpack.cases.caseView.whatsNew.newAttachmentsAria', {
    defaultMessage: '{count, plural, one {# new attachment} other {# new attachments}}',
    values: { count },
  });
