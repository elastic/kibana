/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export { RESOLVE_ACTION_REASON } from '@kbn/alerting-v2-episodes-ui/components/actions/translations';

export const EPISODES_LIST_PAGE_TITLE = i18n.translate('xpack.alertingV2.episodes.listPageTitle', {
  defaultMessage: 'Alert episodes',
});

export const EPISODES_LIST_TABLE_ARIA_LABEL = i18n.translate(
  'xpack.alertingV2.episodes.tableAriaLabel',
  {
    defaultMessage: 'Alerting episodes table',
  }
);

export const EPISODES_LIST_COLUMN_ACTIONS = i18n.translate(
  'xpack.alertingV2.episodes.columns.actions',
  {
    defaultMessage: 'Actions',
  }
);

export const EPISODES_LIST_COLUMN_TAGS = i18n.translate('xpack.alertingV2.episodes.columns.tags', {
  defaultMessage: 'Tags',
});

export const EPISODES_LIST_COLUMN_ASSIGNEES = i18n.translate(
  'xpack.alertingV2.episodes.columns.assignees',
  {
    defaultMessage: 'Assignee',
  }
);

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

export const EPISODES_KPI_ALERTS_TITLE = i18n.translate('xpack.alertingV2.episodes.kpi.alertsTitle', {
  defaultMessage: 'Alerts',
});

export const EPISODES_KPI_ACTIVE_ALERTS = i18n.translate(
  'xpack.alertingV2.episodes.kpi.activeAlerts',
  {
    defaultMessage: 'Active alerts',
  }
);

export const EPISODES_KPI_HIGH_SEVERITY = i18n.translate(
  'xpack.alertingV2.episodes.kpi.highSeverity',
  {
    defaultMessage: '> high severity',
  }
);

export const EPISODES_KPI_TOTAL_ALERTS = i18n.translate('xpack.alertingV2.episodes.kpi.totalAlerts', {
  defaultMessage: 'Total',
});

export const EPISODES_KPI_ACTIONS_TITLE = i18n.translate(
  'xpack.alertingV2.episodes.kpi.actionsTitle',
  {
    defaultMessage: 'Alert actions',
  }
);

export const EPISODES_KPI_ASSIGNED_TO_ME = i18n.translate(
  'xpack.alertingV2.episodes.kpi.assignedToMe',
  {
    defaultMessage: 'Assign to me',
  }
);

export const EPISODES_KPI_UNASSIGNED = i18n.translate('xpack.alertingV2.episodes.kpi.unassigned', {
  defaultMessage: 'Unassigned',
});

export const EPISODES_KPI_ACKNOWLEDGED = i18n.translate(
  'xpack.alertingV2.episodes.kpi.acknowledged',
  {
    defaultMessage: 'Acknowledge',
  }
);

export const EPISODES_KPI_SNOOZED = i18n.translate('xpack.alertingV2.episodes.kpi.snoozed', {
  defaultMessage: 'Snoozed',
});

export const EPISODES_KPI_RULES_TITLE = i18n.translate('xpack.alertingV2.episodes.kpi.rulesTitle', {
  defaultMessage: 'Rules',
});

export const EPISODES_KPI_TOTAL_RULES = i18n.translate('xpack.alertingV2.episodes.kpi.totalRules', {
  defaultMessage: 'Total rules',
});

export const EPISODES_KPI_FIRING_RULES = i18n.translate('xpack.alertingV2.episodes.kpi.firingRules', {
  defaultMessage: 'Firing',
});

export const EPISODES_KPI_ENABLED_RULES = i18n.translate(
  'xpack.alertingV2.episodes.kpi.enabledRules',
  {
    defaultMessage: 'Enabled',
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
    defaultMessage: 'Search episodes…',
  }
);

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
  defaultMessage: 'Edit tags',
});

export const BULK_ERROR_TOAST = i18n.translate('xpack.alertingV2.episodes.bulkActions.errorToast', {
  defaultMessage: 'Failed to update episodes',
});

export const getBulkSuccessToast = (count: number) =>
  i18n.translate('xpack.alertingV2.episodes.bulkActions.successToast', {
    defaultMessage: '{count} {count, plural, one {episode} other {episodes}} updated',
    values: { count },
  });

export const getBulkPartialSuccessToast = (processed: number, total: number) =>
  i18n.translate('xpack.alertingV2.episodes.bulkActions.partialSuccessToast', {
    defaultMessage:
      '{processed} of {total} {total, plural, one {episode} other {episodes}} updated',
    values: { processed, total },
  });
