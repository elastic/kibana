/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const t = (id: string, defaultMessage: string) =>
  i18n.translate(`xpack.cases.caseView.related.${id}`, { defaultMessage });

export const RELATED_BY = t('relatedBy', 'Related by');
export const RELATED_BY_LABELS = {
  linked: t('relatedBy.linked', 'Linked'),
  observable: t('relatedBy.observable', 'Observable'),
  alert: t('relatedBy.alert', 'Alert'),
  event: t('relatedBy.event', 'Event'),
  dashboard: t('relatedBy.dashboard', 'Dashboard'),
  aiVerdict: t('relatedBy.aiVerdict', 'AI verdict'),
} as const;
export const RELATED_BY_WITH_VALUE = (reason: string, value: string) =>
  i18n.translate('xpack.cases.caseView.related.relatedBy.withValue', {
    defaultMessage: '{reason}: {value}',
    values: { reason, value },
  });
export const STATUS_FILTER = t('statusFilter', 'Status');
export const STATUS_OPEN = t('statusFilter.open', 'Open');
export const STATUS_CLOSED = t('statusFilter.closed', 'Closed');
export const CLEAR_FILTERS = t('clearFilters', 'Clear filters');
export const RESTRICTED_NOTE = t(
  'restrictedNote',
  "Restricted cases you aren't assigned to aren't listed."
);
export const CASES_TITLE = t('cases.title', 'Cases');
export const LINK_CASE = t('linkCase', 'Link case…');
export const LINK = t('link', 'Link');
export const UNLINK = t('unlink', 'Unlink');
export const COLUMN_CASE = t('cases.column.case', 'Case');
export const COLUMN_STATUS = t('cases.column.status', 'Status');
export const COLUMN_CLOSE_REASON = t('cases.column.closeReason', 'Close reason');
export const COLUMN_ACTIONS = t('cases.column.actions', 'Actions');
export const RESTRICTED_BADGE = t('restrictedBadge', 'Restricted');
export const UPDATED = (number: string, time: string) =>
  i18n.translate('xpack.cases.caseView.related.cases.meta', {
    defaultMessage: '{number} · Updated {time}',
    values: { number, time },
  });
export const NONE = t('none', '—');
export const INACCESSIBLE_LINKED = (count: number) =>
  i18n.translate('xpack.cases.caseView.related.cases.inaccessible', {
    defaultMessage:
      "{count, plural, one {# more linked case} other {# more linked cases}} you don't have access to.",
    values: { count },
  });
export const EMPTY_TITLE = t('empty.title', 'No related investigations or cases');
export const EMPTY_BODY = t(
  'empty.body',
  'Investigations linked to this case, and cases that share its observables, alerts, events, or dashboards, show here.'
);
export const NO_MATCHES_TITLE = t('noMatches.title', 'Nothing matches these filters');
export const NO_MATCHES_BODY = t('noMatches.body', 'Edit or clear the filters.');
export const ERROR_TITLE = t('errorTitle', "Related cases couldn't be loaded");
export const ERROR_BODY = t(
  'cases.errorBody',
  'The rest of the case is fine. Try again, and if this continues, check that Cases is available in this space.'
);
export const RETRY = t('retry', 'Try again');
export const CASE_LINKED_TOAST = (number: string) =>
  i18n.translate('xpack.cases.caseView.related.caseLinkedToast', {
    defaultMessage: 'Case {number} linked',
    values: { number },
  });
export const CASES_LINKED_TOAST = (count: number) =>
  i18n.translate('xpack.cases.caseView.related.casesLinkedToast', {
    defaultMessage: '{count, plural, one {# case} other {# cases}} linked',
    values: { count },
  });
export const CASE_LINKED_TOAST_BODY = t(
  'caseLinkedToastBody',
  'Both cases now list the link under Related. Nothing was merged or copied.'
);
export const CASE_UNLINKED_TOAST = (number: string) =>
  i18n.translate('xpack.cases.caseView.related.caseUnlinkedToast', {
    defaultMessage: 'Case {number} unlinked',
    values: { number },
  });
export const CASE_UNLINKED_TOAST_BODY = t(
  'caseUnlinkedToastBody',
  'Neither case lists the other under Related now.'
);
export const PICKER_TITLE_CASES = i18n.translate('xpack.cases.caseView.linkPicker.titleCases', {
  defaultMessage: 'Link cases',
});
export const PICKER_HELP_CASES = i18n.translate('xpack.cases.caseView.linkPicker.helpCases', {
  defaultMessage:
    'Linked, not merged. Each case keeps its own activity, attachments, and access, and both cases list the link under Related.',
});
export const PICKER_SEARCH_CASES = i18n.translate('xpack.cases.caseView.linkPicker.searchCases', {
  defaultMessage: 'Search cases',
});
export const PICKER_SELECTED = (count: number) =>
  i18n.translate('xpack.cases.caseView.linkPicker.selected', {
    defaultMessage: '{count} selected',
    values: { count },
  });
export const PICKER_SUBMIT = i18n.translate('xpack.cases.caseView.linkPicker.submit', {
  defaultMessage: 'Link',
});
export const PICKER_CANCEL = i18n.translate('xpack.cases.caseView.linkPicker.cancel', {
  defaultMessage: 'Cancel',
});
export const PICKER_NO_MATCHES = i18n.translate('xpack.cases.caseView.linkPicker.noMatches', {
  defaultMessage: 'No cases match your search.',
});
export const PICKER_LOAD_ERROR = i18n.translate('xpack.cases.caseView.linkPicker.loadError', {
  defaultMessage: "Cases couldn't be loaded. Try again.",
});
export const LINK_ERROR = i18n.translate('xpack.cases.caseView.related.linkError', {
  defaultMessage: "Couldn't link the cases",
});
export const UNLINK_ERROR = i18n.translate('xpack.cases.caseView.related.unlinkError', {
  defaultMessage: "Couldn't unlink the case",
});
export const CASE_NUMBER = (number: number) =>
  i18n.translate('xpack.cases.caseView.related.caseNumber', {
    defaultMessage: '#{number}',
    values: { number },
  });
