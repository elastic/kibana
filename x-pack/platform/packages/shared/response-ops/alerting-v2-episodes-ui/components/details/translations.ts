/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** --- Overview list --- */
export const OVERVIEW_LIST_SECTION_LOAD_ERROR = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.overviewListSection.loadError',
  {
    defaultMessage: 'Could not load episode details.',
  }
);

export const ACTIONS_OVERVIEW_ACKNOWLEDGED_BY = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.actionsOverview.acknowledgedBy',
  {
    defaultMessage: 'Acknowledged by',
  }
);

export const ACTIONS_OVERVIEW_RESOLVED_BY = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.actionsOverview.resolvedBy',
  {
    defaultMessage: 'Resolved by',
  }
);

export const ACTIONS_OVERVIEW_SNOOZED_BY = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.actionsOverview.snoozedBy',
  {
    defaultMessage: 'Snoozed by',
  }
);

export const ACTIONS_OVERVIEW_SNOOZED_UNTIL = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.actionsOverview.snoozedUntil',
  {
    defaultMessage: 'Snoozed until',
  }
);

/** --- Flyout --- */
export const FLYOUT_ARIA_LABEL = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.flyout.ariaLabel',
  {
    defaultMessage: 'Alert episode details',
  }
);

export const FLYOUT_TAB_OVERVIEW = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.flyout.tab.overview',
  {
    defaultMessage: 'Overview',
  }
);

export const FLYOUT_TAB_TIMELINE = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.flyout.tab.timeline',
  {
    defaultMessage: 'Timeline',
  }
);

export const FLYOUT_TAB_METADATA = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.flyout.tab.metadata',
  {
    defaultMessage: 'Metadata',
  }
);

export const FLYOUT_ACCORDION_ABOUT = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.flyout.accordion.about',
  {
    defaultMessage: 'About',
  }
);

export const FLYOUT_ACCORDION_INVESTIGATION = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.flyout.accordion.investigation',
  {
    defaultMessage: 'Investigation',
  }
);

export const FLYOUT_ACCORDION_RULE = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.flyout.accordion.rule',
  {
    defaultMessage: 'Rule',
  }
);

export const FLYOUT_INFO_BLOCK_ALERT_ID = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.flyout.infoBlock.alertId',
  {
    defaultMessage: 'Alert ID',
  }
);

export const getFlyoutCopyAlertIdTooltip = (alertId: string) =>
  i18n.translate('xpack.alertingV2EpisodesUi.details.flyout.infoBlock.copyAlertIdTooltip', {
    defaultMessage: 'Click to copy the full alert ID: {alertId}',
    values: { alertId },
  });

export const FLYOUT_ALERT_ID_COPIED = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.flyout.infoBlock.alertIdCopied',
  {
    defaultMessage: 'Alert ID copied',
  }
);

export const FLYOUT_INFO_BLOCK_SEVERITY = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.flyout.infoBlock.severity',
  {
    defaultMessage: 'Severity',
  }
);

export const FLYOUT_INFO_BLOCK_ASSIGNEE = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.flyout.infoBlock.assignee',
  {
    defaultMessage: 'Assignee',
  }
);

export const FLYOUT_INFO_BLOCK_DURATION = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.flyout.infoBlock.duration',
  {
    defaultMessage: 'Duration',
  }
);

export const FLYOUT_BADGE_FLAPPING = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.flyout.badge.flapping',
  {
    defaultMessage: 'Flapping',
  }
);

export const FLYOUT_BADGE_SNOOZED = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.flyout.badge.snoozed',
  {
    defaultMessage: 'Snoozed',
  }
);

export const getFlyoutSnoozedUntilTooltip = (expiry: string) =>
  i18n.translate('xpack.alertingV2EpisodesUi.details.flyout.snoozedUntilTooltip', {
    defaultMessage: 'Notifications snoozed until {expiry}.',
    values: { expiry },
  });

export const FLYOUT_SNOOZED_TOOLTIP_UNKNOWN_EXPIRY = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.flyout.snoozedTooltipUnknownExpiry',
  {
    defaultMessage: 'Notifications are snoozed.',
  }
);

export const FLYOUT_BADGE_ACKNOWLEDGED = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.flyout.badge.acknowledged',
  {
    defaultMessage: 'Acknowledged',
  }
);

export const FLYOUT_VIEW_DETAILS = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.flyout.viewDetails',
  {
    defaultMessage: 'View details',
  }
);

export const FLYOUT_TAKE_ACTION = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.flyout.takeAction',
  {
    defaultMessage: 'Take action',
  }
);

export const FLYOUT_CLOSE = i18n.translate('xpack.alertingV2EpisodesUi.details.flyout.close', {
  defaultMessage: 'Close',
});

/** --- Header --- */
export const HEADER_EPISODE_TITLE_FALLBACK = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.header.episodeTitleFallback',
  {
    defaultMessage: 'Alert episode',
  }
);

/** --- Lifecycle heatmap --- */
export const LIFECYCLE_HEATMAP_TITLE = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.lifecycleHeatmap.title',
  {
    defaultMessage: 'Episode timeline',
  }
);

export const LIFECYCLE_HEATMAP_EMPTY_TITLE = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.lifecycleHeatmap.emptyTitle',
  {
    defaultMessage: 'No events in this episode yet',
  }
);

export const LIFECYCLE_HEATMAP_EMPTY_BODY = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.lifecycleHeatmap.emptyBody',
  {
    defaultMessage: 'Status changes across the episode lifecycle will appear here.',
  }
);

export const LIFECYCLE_HEATMAP_PENDING_STATUS_LABEL = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.lifecycleHeatmap.pendingStatusLabel',
  {
    defaultMessage: 'Pending',
  }
);

export const LIFECYCLE_HEATMAP_ACTIVE_STATUS_LABEL = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.lifecycleHeatmap.activeStatusLabel',
  {
    defaultMessage: 'Active',
  }
);

export const LIFECYCLE_HEATMAP_RECOVERING_STATUS_LABEL = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.lifecycleHeatmap.recoveringStatusLabel',
  {
    defaultMessage: 'Recovering',
  }
);

export const LIFECYCLE_HEATMAP_INACTIVE_STATUS_LABEL = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.lifecycleHeatmap.inactiveStatusLabel',
  {
    defaultMessage: 'Inactive',
  }
);

export const LIFECYCLE_HEATMAP_UNKNOWN_STATUS_LABEL = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.lifecycleHeatmap.unknownStatusLabel',
  {
    defaultMessage: 'Unknown',
  }
);

/** --- Severity heatmap --- */
export const SEVERITY_HEATMAP_TITLE = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.severityHeatmap.title',
  {
    defaultMessage: 'Severity timeline',
  }
);

export const SEVERITY_HEATMAP_TOOLTIP_FIELD_COLUMN = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.severityHeatmap.tooltipFieldColumn',
  {
    defaultMessage: 'Field',
  }
);

export const SEVERITY_HEATMAP_TOOLTIP_VALUE_COLUMN = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.severityHeatmap.tooltipValueColumn',
  {
    defaultMessage: 'Value',
  }
);

export const SEVERITY_HEATMAP_EVENT_DATA_TABLE_CAPTION = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.severityHeatmap.eventDataTableCaption',
  {
    defaultMessage: 'Alert evaluation data fields and values',
  }
);

export const SEVERITY_HEATMAP_CLICK_TO_SEE_DATA = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.severityHeatmap.clickToSeeData',
  {
    defaultMessage: 'Click to see data',
  }
);

export const SEVERITY_HEATMAP_DETAIL_PANEL_CLOSE_ARIA_LABEL = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.severityHeatmap.detailPanelCloseAriaLabel',
  {
    defaultMessage: 'Close severity event data panel',
  }
);

export const SEVERITY_HEATMAP_DETAIL_PANEL_EMPTY = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.severityHeatmap.detailPanelEmpty',
  {
    defaultMessage: 'No evaluation data is available for this event.',
  }
);

/** --- Severity heatmap section --- */
export const SEVERITY_HEATMAP_SECTION_LOAD_ERROR = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.severityHeatmapSection.loadError',
  {
    defaultMessage: 'Could not load episode severity.',
  }
);

/** --- Timeline heatmaps section --- */
export const TIMELINE_HEATMAPS_SECTION_LOAD_ERROR = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.timelineHeatmapsSection.loadError',
  {
    defaultMessage: 'Could not load episode timeline.',
  }
);

/** --- Metadata details list --- */
export const METADATA_LIST_GROUPING_LABEL = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.metadataList.groupingLabel',
  {
    defaultMessage: 'Grouping',
  }
);

export const METADATA_LIST_GROUPING_ERROR = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.metadataList.groupingError',
  {
    defaultMessage: 'Could not load grouping.',
  }
);

export const METADATA_LIST_TRIGGERED_LABEL = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.metadataList.triggeredLabel',
  {
    defaultMessage: 'Triggered',
  }
);

export const METADATA_LIST_DURATION_LABEL = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.metadataList.durationLabel',
  {
    defaultMessage: 'Duration',
  }
);

export const METADATA_LIST_ASSIGNEE_LABEL = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.metadataList.assigneeLabel',
  {
    defaultMessage: 'Assignee',
  }
);

export const METADATA_LIST_TAGS_LABEL = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.metadataList.tagsLabel',
  {
    defaultMessage: 'Alert tags',
  }
);

export const METADATA_LIST_SOURCE_URL_LABEL = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.metadataList.sourceUrlLabel',
  {
    defaultMessage: 'Source',
  }
);

export const METADATA_LIST_SOURCE_URL_LINK = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.metadataList.sourceUrlLink',
  {
    defaultMessage: 'View in source system',
  }
);

export const formatMetadataListDuration = (ms: number): string => {
  if (ms < 1000) {
    return i18n.translate('xpack.alertingV2EpisodesUi.details.metadataList.durationMs', {
      defaultMessage: '{ms} ms',
      values: { ms: Math.round(ms) },
    });
  }
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) {
    return i18n.translate('xpack.alertingV2EpisodesUi.details.metadataList.durationDays', {
      defaultMessage: '{days} d',
      values: { days },
    });
  }
  if (hours > 0) {
    return i18n.translate('xpack.alertingV2EpisodesUi.details.metadataList.durationHours', {
      defaultMessage: '{hours} h',
      values: { hours },
    });
  }
  if (minutes > 0) {
    return i18n.translate('xpack.alertingV2EpisodesUi.details.metadataList.durationMinutes', {
      defaultMessage: '{minutes} min',
      values: { minutes },
    });
  }
  return i18n.translate('xpack.alertingV2EpisodesUi.details.metadataList.durationSeconds', {
    defaultMessage: '{seconds} s',
    values: { seconds },
  });
};

/** --- Metadata section --- */
export const METADATA_SECTION_ERROR = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.metadataSection.error',
  {
    defaultMessage: 'Failed to load metadata.',
  }
);

export const METADATA_SECTION_EMPTY = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.metadataSection.empty',
  {
    defaultMessage: 'No evaluation data is available for this episode.',
  }
);

/** --- Metadata table --- */
export const getMetadataTableStaleDataCallout = (timestamp: string): string =>
  i18n.translate('xpack.alertingV2EpisodesUi.details.metadataTable.staleDataCallout', {
    defaultMessage:
      'Showing data from the last active rule event that matched source data, on {timestamp}.',
    values: { timestamp },
  });

/** --- Related section --- */
export const RELATED_SECTION_LOAD_ERROR = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.relatedSection.loadError',
  {
    defaultMessage: 'Could not load related episodes.',
  }
);

/** --- Rule overview panel --- */
export const RULE_OVERVIEW_TITLE = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.ruleOverview.title',
  {
    defaultMessage: 'Rule overview',
  }
);

export const RULE_OVERVIEW_VIEW_DETAILS = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.ruleOverview.viewDetails',
  {
    defaultMessage: 'View rule details',
  }
);

export const RULE_OVERVIEW_ENABLED = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.ruleOverview.enabled',
  {
    defaultMessage: 'Enabled',
  }
);

export const RULE_OVERVIEW_DISABLED = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.ruleOverview.disabled',
  {
    defaultMessage: 'Disabled',
  }
);

/** --- Rule overview panel section --- */
export const RULE_OVERVIEW_PANEL_SECTION_ERROR_TITLE = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.ruleOverviewPanelSection.errorTitle',
  {
    defaultMessage: 'Could not load rule overview',
  }
);

/** --- Runbook --- */
export const RUNBOOK_TITLE = i18n.translate('xpack.alertingV2EpisodesUi.details.runbook.title', {
  defaultMessage: 'Runbook',
});

export const RUNBOOK_SHOW_FULL_GUIDE = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.runbook.showFullGuide',
  {
    defaultMessage: 'Show full guide',
  }
);

export const RUNBOOK_FULL_GUIDE_ARIA_LABEL = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.runbook.fullGuideAriaLabel',
  {
    defaultMessage: 'Runbook full guide',
  }
);

export const RUNBOOK_EMPTY = i18n.translate('xpack.alertingV2EpisodesUi.details.runbook.empty', {
  defaultMessage: 'No runbook available for this rule.',
});

/** --- Runbook section --- */
export const RUNBOOK_SECTION_LOAD_ERROR = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.runbookSection.loadError',
  {
    defaultMessage: 'Could not load the runbook for this episode.',
  }
);

/** --- Trend chart section --- */
export const TREND_CHART_TITLE = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.trendChart.title',
  {
    defaultMessage: 'Trend',
  }
);

export const TREND_CHART_LOAD_ERROR = i18n.translate(
  'xpack.alertingV2EpisodesUi.details.trendChart.loadError',
  {
    defaultMessage: 'Unable to load the trend chart.',
  }
);

export const getTrendChartThresholdComparatorLabel = (
  metric: string,
  comparator: string,
  threshold: number
): string =>
  i18n.translate('xpack.alertingV2EpisodesUi.details.trendChart.thresholdComparatorLabel', {
    defaultMessage: '{metric} {comparator} {threshold}',
    values: { metric, comparator, threshold },
  });
