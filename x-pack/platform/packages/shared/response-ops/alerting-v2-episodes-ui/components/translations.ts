/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** --- Assignee cell --- */
export const ASSIGNEE_CELL_EMPTY = i18n.translate('xpack.alertingV2EpisodesUi.assigneeCell.empty', {
  defaultMessage: '—',
});

export const ASSIGNEE_CELL_PROFILE_LOAD_ERROR = i18n.translate(
  'xpack.alertingV2EpisodesUi.assigneeCell.profileLoadError',
  {
    defaultMessage: 'Could not load profile',
  }
);

export const ASSIGNEE_CELL_UNKNOWN_USER = i18n.translate(
  'xpack.alertingV2EpisodesUi.assigneeCell.unknownUser',
  {
    defaultMessage: 'Unknown user',
  }
);

/** --- Rule fetch hook --- */
export const FETCH_RULE_ERROR = i18n.translate(
  'xpack.alertingV2EpisodesUi.hooks.useFetchRule.errorMessage',
  {
    defaultMessage: 'Failed to load rule',
  }
);

/** --- Rule cell --- */
export const RULE_CELL_EMPTY_RULE = i18n.translate(
  'xpack.alertingV2EpisodesUi.ruleCell.emptyRule',
  {
    defaultMessage: '—',
  }
);

export const RULE_CELL_MISSING_RULE_LABEL = i18n.translate(
  'xpack.alertingV2EpisodesUi.ruleCell.missingRuleLabel',
  {
    defaultMessage: 'Unavailable rule',
  }
);

export const RULE_CELL_MISSING_RULE_TOOLTIP = i18n.translate(
  'xpack.alertingV2EpisodesUi.ruleCell.missingRuleTooltip',
  {
    defaultMessage:
      'This rule is not available. It may have been deleted, or you may not have access to it.',
  }
);

export const getRuleCellCopyRuleIdTooltip = (ruleId: string) =>
  i18n.translate('xpack.alertingV2EpisodesUi.ruleCell.copyRuleIdTooltip', {
    defaultMessage: 'Click to copy the full rule ID: {ruleId}',
    values: { ruleId },
  });

export const getDurationLowerBoundLabel = (duration: string) =>
  i18n.translate('xpack.alertingV2EpisodesUi.durationCell.lowerBoundLabel', {
    defaultMessage: '≥ {duration}',
    values: { duration },
  });

export const DURATION_LOWER_BOUND_TOOLTIP = i18n.translate(
  'xpack.alertingV2EpisodesUi.durationCell.lowerBoundTooltip',
  {
    defaultMessage:
      'The alert started before the selected time range, so its actual duration is longer. Widen the time range or open the alert to see it.',
  }
);

export const RULE_CELL_RULE_ID_COPIED = i18n.translate(
  'xpack.alertingV2EpisodesUi.ruleCell.ruleIdCopied',
  {
    defaultMessage: 'Rule ID copied',
  }
);

export const SUPPRESSED_BY_MAINTENANCE_WINDOW = i18n.translate(
  'xpack.alertingV2EpisodesUi.suppressedCell.suppressedByMWBadge',
  {
    defaultMessage: 'Suppressed by maintenance window',
  }
);

/** --- Episodes histogram --- */
export const EPISODES_HISTOGRAM_CAP_WARNING = i18n.translate(
  'xpack.alertingV2EpisodesUi.episodesHistogram.capWarning',
  {
    defaultMessage: 'Results may be incomplete — too many alerts in this time range.',
  }
);

export const EPISODES_HISTOGRAM_QUERY_ERROR = i18n.translate(
  'xpack.alertingV2EpisodesUi.episodesHistogram.queryError',
  { defaultMessage: 'Failed to load histogram data.' }
);

export const EPISODES_HISTOGRAM_RETRY = i18n.translate(
  'xpack.alertingV2EpisodesUi.episodesHistogram.retry',
  { defaultMessage: 'Retry' }
);

/** --- Episodes KPIs --- */
export const EPISODES_KPIS_ALERTS_PANEL_TITLE = i18n.translate(
  'xpack.alertingV2EpisodesUi.episodesKpis.alertsPanelTitle',
  { defaultMessage: 'Alerts' }
);

export const EPISODES_KPIS_ALERT_ACTIONS_PANEL_TITLE = i18n.translate(
  'xpack.alertingV2EpisodesUi.episodesKpis.alertActionsPanelTitle',
  { defaultMessage: 'Alert actions' }
);

export const EPISODES_KPIS_ALERTS_COUNT = i18n.translate(
  'xpack.alertingV2EpisodesUi.episodesKpis.alertsCount',
  { defaultMessage: 'Alerts count' }
);

export const EPISODES_KPIS_FIRING_RULES = i18n.translate(
  'xpack.alertingV2EpisodesUi.episodesKpis.firingRules',
  { defaultMessage: 'Firing rules' }
);

export const EPISODES_KPIS_ASSIGNED_TO_ME = i18n.translate(
  'xpack.alertingV2EpisodesUi.episodesKpis.assignedToMe',
  { defaultMessage: 'Assigned to me' }
);

export const EPISODES_KPIS_UNASSIGNED_ALERTS = i18n.translate(
  'xpack.alertingV2EpisodesUi.episodesKpis.unassignedAlerts',
  { defaultMessage: 'Unassigned alerts' }
);

export const EPISODES_KPIS_ACKNOWLEDGED = i18n.translate(
  'xpack.alertingV2EpisodesUi.episodesKpis.acknowledged',
  { defaultMessage: 'Acknowledged' }
);

export const EPISODES_KPIS_SNOOZED = i18n.translate(
  'xpack.alertingV2EpisodesUi.episodesKpis.snoozed',
  { defaultMessage: 'Snoozed' }
);

export const EPISODES_KPIS_ERROR_TITLE = i18n.translate(
  'xpack.alertingV2EpisodesUi.episodesKpis.errorTitle',
  {
    defaultMessage: 'Unable to load alert statistics',
  }
);

export const EPISODES_KPIS_ERROR = i18n.translate('xpack.alertingV2EpisodesUi.episodesKpis.error', {
  defaultMessage: 'An error occurred while fetching the alert statistics. Try refreshing the page.',
});

/** --- Classic alert details flyout --- */
export const CLASSIC_ALERT_DETAILS_CLOSE = i18n.translate(
  'xpack.alertingV2EpisodesUi.classicAlertDetails.closeButton',
  {
    defaultMessage: 'Close',
  }
);

export const CLASSIC_ALERT_DETAILS_ERROR_BODY = i18n.translate(
  'xpack.alertingV2EpisodesUi.classicAlertDetails.errorBody',
  {
    defaultMessage:
      'The classic alert could not be loaded. It may have been deleted, or you may not have access to it.',
  }
);

export const CLASSIC_ALERT_DETAILS_ERROR_TITLE = i18n.translate(
  'xpack.alertingV2EpisodesUi.classicAlertDetails.errorTitle',
  {
    defaultMessage: 'Unable to load classic alert',
  }
);

export const CLASSIC_ALERT_DETAILS_FIELDS_TAB = i18n.translate(
  'xpack.alertingV2EpisodesUi.classicAlertDetails.fieldsTab',
  {
    defaultMessage: 'Fields',
  }
);

export const CLASSIC_ALERT_DETAILS_FIELD_DURATION = i18n.translate(
  'xpack.alertingV2EpisodesUi.classicAlertDetails.field.duration',
  {
    defaultMessage: 'Duration',
  }
);

export const CLASSIC_ALERT_DETAILS_FIELD_LAST_UPDATED = i18n.translate(
  'xpack.alertingV2EpisodesUi.classicAlertDetails.field.lastUpdated',
  {
    defaultMessage: 'Last updated',
  }
);

export const CLASSIC_ALERT_DETAILS_FIELD_REASON = i18n.translate(
  'xpack.alertingV2EpisodesUi.classicAlertDetails.field.reason',
  {
    defaultMessage: 'Reason',
  }
);

export const CLASSIC_ALERT_DETAILS_FIELD_RULE = i18n.translate(
  'xpack.alertingV2EpisodesUi.classicAlertDetails.field.rule',
  {
    defaultMessage: 'Rule',
  }
);

export const CLASSIC_ALERT_DETAILS_FIELD_SEVERITY = i18n.translate(
  'xpack.alertingV2EpisodesUi.classicAlertDetails.field.severity',
  {
    defaultMessage: 'Severity',
  }
);

export const CLASSIC_ALERT_DETAILS_FIELD_STARTED = i18n.translate(
  'xpack.alertingV2EpisodesUi.classicAlertDetails.field.started',
  {
    defaultMessage: 'Triggered',
  }
);

export const CLASSIC_ALERT_DETAILS_FIELD_STATUS = i18n.translate(
  'xpack.alertingV2EpisodesUi.classicAlertDetails.field.status',
  {
    defaultMessage: 'Status',
  }
);

export const CLASSIC_ALERT_DETAILS_FIELD_TAGS = i18n.translate(
  'xpack.alertingV2EpisodesUi.classicAlertDetails.field.tags',
  {
    defaultMessage: 'Tags',
  }
);
export const CLASSIC_ALERT_DETAILS_LOADING = i18n.translate(
  'xpack.alertingV2EpisodesUi.classicAlertDetails.loading',
  {
    defaultMessage: 'Loading classic alert',
  }
);

export const CLASSIC_ALERT_DETAILS_OVERVIEW_TAB = i18n.translate(
  'xpack.alertingV2EpisodesUi.classicAlertDetails.overviewTab',
  {
    defaultMessage: 'Overview',
  }
);

export const CLASSIC_ALERT_DETAILS_TITLE = i18n.translate(
  'xpack.alertingV2EpisodesUi.classicAlertDetails.title',
  {
    defaultMessage: 'Classic rule alert',
  }
);
