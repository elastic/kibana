/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const EPISODES_LIST_PAGE_TITLE = i18n.translate('xpack.alertingV2.episodes.listPageTitle', {
  defaultMessage: 'Alerts',
});

export const EPISODES_LIST_MANAGE_RULES = i18n.translate(
  'xpack.alertingV2.episodes.manageRulesButton',
  {
    defaultMessage: 'Manage rules',
  }
);

export const EPISODES_LIST_TABLE_ARIA_LABEL = i18n.translate(
  'xpack.alertingV2.episodes.tableAriaLabel',
  {
    defaultMessage: 'Alerts table',
  }
);

export const EPISODES_LIST_COLUMN_ACTIONS = i18n.translate(
  'xpack.alertingV2.episodes.columns.actions',
  {
    defaultMessage: 'Actions',
  }
);

export const EPISODES_LIST_COLUMN_ALERT_TAGS = i18n.translate(
  'xpack.alertingV2.episodes.columns.tags',
  {
    defaultMessage: 'Alert tags',
  }
);

export const EPISODES_LIST_COLUMN_RULE_TAGS = i18n.translate(
  'xpack.alertingV2.episodes.columns.ruleTags',
  {
    defaultMessage: 'Rule tags',
  }
);

export const EPISODES_LIST_COLUMN_ASSIGNEES = i18n.translate(
  'xpack.alertingV2.episodes.columns.assignees',
  {
    defaultMessage: 'Assignee',
  }
);

export const EPISODES_LIST_COLUMN_SOURCE = i18n.translate(
  'xpack.alertingV2.episodes.columns.source',
  {
    defaultMessage: 'Source',
  }
);

export const EPISODES_LIST_COLUMN_SUPPRESSED = i18n.translate(
  'xpack.alertingV2.episodes.columns.suppressed',
  {
    defaultMessage: 'Suppressed',
  }
);

export const EPISODES_LIST_ITEM_COUNT = (count: number) =>
  i18n.translate('xpack.alertingV2.episodes.itemCount', {
    defaultMessage: 'Showing {count, plural, one {# alert} other {# alerts}}',
    values: { count },
  });

export const EPISODES_LIST_ITEM_COUNT_CAPPED = (count: number) =>
  i18n.translate('xpack.alertingV2.episodes.itemCountCapped', {
    defaultMessage: 'Showing first {count} alerts',
    values: { count },
  });

export const EPISODES_LIST_ITEM_COUNT_CAPPED_TOOLTIP = (count: number) =>
  i18n.translate('xpack.alertingV2.episodes.itemCountCappedTooltip', {
    defaultMessage:
      'The table loads at most {count} alerts. Narrow the time range or filters to find others.',
    values: { count },
  });

export const EPISODES_ASSIGNEE_EMPTY = i18n.translate('xpack.alertingV2.episodes.assignees.empty', {
  defaultMessage: '—',
});

export const EPISODES_ASSIGNEE_PROFILE_LOAD_ERROR = i18n.translate(
  'xpack.alertingV2.episodes.assignees.profileLoadError',
  {
    defaultMessage: 'Could not load profile',
  }
);

export const EPISODES_ASSIGNEE_UNKNOWN_USER = i18n.translate(
  'xpack.alertingV2.episodes.assignees.unknownUser',
  {
    defaultMessage: 'Unknown user',
  }
);

export const EPISODES_FILTER_BAR_RESET_FILTERS = i18n.translate(
  'xpack.alertingV2.episodes.filterBar.resetFilters',
  {
    defaultMessage: 'Reset filters',
  }
);

export const EPISODES_FILTER_BAR_SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.alertingV2.episodes.filterBar.searchPlaceholder',
  {
    defaultMessage: 'Search alerts…',
  }
);

export const EPISODES_FILTER_BAR_SEARCH_ARIA_LABEL = i18n.translate(
  'xpack.alertingV2.episodes.filterBar.searchAriaLabel',
  {
    defaultMessage: 'Filter alerts',
  }
);

export const EPISODES_FILTER_BAR_SEARCH_SYNTAX_ERROR = i18n.translate(
  'xpack.alertingV2.episodes.filterBar.searchSyntaxErrorTooltip',
  {
    defaultMessage: 'Fix the KQL syntax before updating.',
  }
);

export const getEpisodesFilterBarNumericValueError = (field: string) =>
  i18n.translate('xpack.alertingV2.episodes.filterBar.numericValueErrorTooltip', {
    defaultMessage: '{field} requires a numeric value.',
    values: { field },
  });

export const getEpisodesFilterBarDateValueError = (field: string) =>
  i18n.translate('xpack.alertingV2.episodes.filterBar.dateValueErrorTooltip', {
    defaultMessage: '{field} requires an ISO date value.',
    values: { field },
  });

export const getEpisodesFilterBarWildcardError = (field: string) =>
  i18n.translate('xpack.alertingV2.episodes.filterBar.wildcardErrorTooltip', {
    defaultMessage: 'Wildcards are not supported for {field}.',
    values: { field },
  });

export const getEpisodesFilterBarRangeValueError = (field: string) =>
  i18n.translate('xpack.alertingV2.episodes.filterBar.rangeValueErrorTooltip', {
    defaultMessage: '{field} range comparisons require a string or number.',
    values: { field },
  });

export const BULK_ACKNOWLEDGE = i18n.translate(
  'xpack.alertingV2.episodes.bulkActions.acknowledge',
  { defaultMessage: 'Acknowledge' }
);

export const BULK_UNACKNOWLEDGE = i18n.translate(
  'xpack.alertingV2.episodes.bulkActions.unacknowledge',
  { defaultMessage: 'Unacknowledge' }
);

export const BULK_SNOOZE = i18n.translate('xpack.alertingV2.episodes.bulkActions.snooze', {
  defaultMessage: 'Snooze',
});

export const BULK_UNSNOOZE = i18n.translate('xpack.alertingV2.episodes.bulkActions.unsnooze', {
  defaultMessage: 'Unsnooze',
});

export const BULK_RESOLVE = i18n.translate('xpack.alertingV2.episodes.bulkActions.resolve', {
  defaultMessage: 'Resolve',
});

export const BULK_UNRESOLVE = i18n.translate('xpack.alertingV2.episodes.bulkActions.activate', {
  defaultMessage: 'Unresolve',
});

export const BULK_EDIT_TAGS = i18n.translate('xpack.alertingV2.episodes.bulkActions.editTags', {
  defaultMessage: 'Edit alert tags',
});

export const BULK_ERROR_TOAST = i18n.translate('xpack.alertingV2.episodes.bulkActions.errorToast', {
  defaultMessage: 'Failed to update alerts',
});

export const getBulkSuccessToast = (count: number) =>
  i18n.translate('xpack.alertingV2.episodes.bulkActions.successToast', {
    defaultMessage: '{count} {count, plural, one {alert} other {alerts}} updated',
    values: { count },
  });

export const getBulkPartialSuccessToast = (processed: number, total: number) =>
  i18n.translate('xpack.alertingV2.episodes.bulkActions.partialSuccessToast', {
    defaultMessage: '{processed} of {total} {total, plural, one {alert} other {alerts}} updated',
    values: { processed, total },
  });
