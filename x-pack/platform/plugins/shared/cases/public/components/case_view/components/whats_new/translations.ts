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

export const NEW_ITEMS = (count: number) =>
  i18n.translate('xpack.cases.caseView.whatsNew.newItems', {
    defaultMessage: '{count, plural, one {# new item} other {# new items}}',
    values: { count },
  });

export const JUMP_TO_FIRST_CHANGE = i18n.translate('xpack.cases.caseView.whatsNew.jumpToFirst', {
  defaultMessage: 'Jump to first change',
});

export const ALERTS_ADDED = (count: number, rules: string) =>
  i18n.translate('xpack.cases.caseView.whatsNew.alertsAdded', {
    defaultMessage:
      '{count, plural, one {# alert} other {# alerts}} added{hasRules, select, true {: {rules}} other {}}',
    values: { count, rules, hasRules: String(rules.length > 0) },
  });

export const STATUS_SET = (status: string, author: string) =>
  i18n.translate('xpack.cases.caseView.whatsNew.statusSet', {
    defaultMessage: 'Status set to {status} by {author}',
    values: { status, author },
  });

export const SEVERITY_SET = (severity: string, author: string) =>
  i18n.translate('xpack.cases.caseView.whatsNew.severitySet', {
    defaultMessage: 'Severity set to {severity} by {author}',
    values: { severity, author },
  });

export const OTHER_CHANGES = (count: number) =>
  i18n.translate('xpack.cases.caseView.whatsNew.otherChanges', {
    defaultMessage: '{count, plural, one {# other case change} other {# other case changes}}',
    values: { count },
  });

export const COMMENTS_FROM = (count: number, authors: string) =>
  i18n.translate('xpack.cases.caseView.whatsNew.commentsFrom', {
    defaultMessage: '{count, plural, one {# comment} other {# comments}} from {authors}',
    values: { count, authors },
  });

export const FILES_ADDED = (names: string) =>
  i18n.translate('xpack.cases.caseView.whatsNew.filesAdded', {
    defaultMessage: 'Files added: {names}',
    values: { names },
  });

export const OBSERVABLES_CHANGED = (count: number, actionType: string) =>
  i18n.translate('xpack.cases.caseView.whatsNew.observablesChanged', {
    defaultMessage:
      '{count, plural, one {# observable} other {# observables}} {actionType, select, add {added} delete {removed} other {updated}}',
    values: { count, actionType },
  });

export const AND_MORE = (list: string, more: number) =>
  i18n.translate('xpack.cases.caseView.whatsNew.andMore', {
    defaultMessage: '{list} and {more} more',
    values: { list, more },
  });
