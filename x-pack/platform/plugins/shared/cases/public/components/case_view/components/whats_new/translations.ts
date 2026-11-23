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

export const SUMMARIZE_WITH_AI = i18n.translate('xpack.cases.caseView.whatsNew.summarizeWithAi', {
  defaultMessage: 'Summarize with AI',
});

export const AI_SUMMARY_TITLE = i18n.translate('xpack.cases.caseView.whatsNew.aiSummaryTitle', {
  defaultMessage: 'AI summary',
});

export const AI_SUMMARY_DISCLAIMER = i18n.translate(
  'xpack.cases.caseView.whatsNew.aiSummaryDisclaimer',
  {
    defaultMessage: 'AI-generated. Check the sources.',
  }
);

export const AI_SUMMARY_LOADING = i18n.translate('xpack.cases.caseView.whatsNew.aiSummaryLoading', {
  defaultMessage: 'Summarizing the new activity',
});

export const AI_SUMMARY_ERROR_TITLE = i18n.translate(
  'xpack.cases.caseView.whatsNew.aiSummaryErrorTitle',
  {
    defaultMessage: 'Could not summarize the new activity',
  }
);

export const AI_SUMMARY_ERROR_BODY = i18n.translate(
  'xpack.cases.caseView.whatsNew.aiSummaryErrorBody',
  {
    defaultMessage: 'The AI model did not answer. Try again, or read the lists above.',
  }
);

export const AI_SUMMARY_EMPTY = i18n.translate('xpack.cases.caseView.whatsNew.aiSummaryEmpty', {
  defaultMessage: 'The model returned no summary.',
});

export const TRY_AGAIN = i18n.translate('xpack.cases.caseView.whatsNew.tryAgain', {
  defaultMessage: 'Try again',
});

export const REGENERATE = i18n.translate('xpack.cases.caseView.whatsNew.regenerate', {
  defaultMessage: 'Regenerate',
});

export const SOURCES = i18n.translate('xpack.cases.caseView.whatsNew.sources', {
  defaultMessage: 'Sources',
});

export const SOURCE_ALERT = (rule: string) =>
  i18n.translate('xpack.cases.caseView.whatsNew.sourceAlert', {
    defaultMessage: 'Alert {rule}',
    values: { rule },
  });

export const SOURCE_ALERT_NO_RULE = i18n.translate(
  'xpack.cases.caseView.whatsNew.sourceAlertNoRule',
  {
    defaultMessage: 'Alert',
  }
);

export const SOURCE_COMMENT = (author: string) =>
  i18n.translate('xpack.cases.caseView.whatsNew.sourceComment', {
    defaultMessage: 'Comment by {author}',
    values: { author },
  });

export const SOURCE_STATUS = (status: string, author: string) =>
  i18n.translate('xpack.cases.caseView.whatsNew.sourceStatus', {
    defaultMessage: 'Status set to {status} by {author}',
    values: { status, author },
  });

export const SOURCE_SEVERITY = (severity: string, author: string) =>
  i18n.translate('xpack.cases.caseView.whatsNew.sourceSeverity', {
    defaultMessage: 'Severity set to {severity} by {author}',
    values: { severity, author },
  });

export const SOURCE_FILE = (name: string) =>
  i18n.translate('xpack.cases.caseView.whatsNew.sourceFile', {
    defaultMessage: 'File {name}',
    values: { name },
  });

export const SOURCE_OBSERVABLES = (count: number, actionType: string) =>
  i18n.translate('xpack.cases.caseView.whatsNew.sourceObservables', {
    defaultMessage:
      '{count, plural, one {# observable} other {# observables}} {actionType, select, add {added} delete {removed} other {updated}}',
    values: { count, actionType },
  });

export const SOURCE_OTHER_CHANGE = (author: string) =>
  i18n.translate('xpack.cases.caseView.whatsNew.sourceOtherChange', {
    defaultMessage: 'Case change by {author}',
    values: { author },
  });
