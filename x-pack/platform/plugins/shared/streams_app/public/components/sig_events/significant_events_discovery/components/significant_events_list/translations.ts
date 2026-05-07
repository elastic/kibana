/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TRANSLATIONS = {
  searchPlaceholder: i18n.translate('xpack.streams.sigEventsList.searchPlaceholder', {
    defaultMessage: 'Search events...',
  }),
  verdictFilter: i18n.translate('xpack.streams.sigEventsList.verdictFilter', {
    defaultMessage: 'Verdict',
  }),
  verdictPopoverAriaLabel: i18n.translate('xpack.streams.sigEventsList.verdictPopoverAriaLabel', {
    defaultMessage: 'Filter by verdict',
  }),
  impactFilter: i18n.translate('xpack.streams.sigEventsList.impactFilter', {
    defaultMessage: 'Impact',
  }),
  impactPopoverAriaLabel: i18n.translate('xpack.streams.sigEventsList.impactPopoverAriaLabel', {
    defaultMessage: 'Filter by impact',
  }),
  refreshButton: i18n.translate('xpack.streams.sigEventsList.refreshButton', {
    defaultMessage: 'Refresh',
  }),
  tableCaption: i18n.translate('xpack.streams.sigEventsList.tableCaption', {
    defaultMessage: 'Significant events',
  }),
  loadingMessage: i18n.translate('xpack.streams.sigEventsList.loadingMessage', {
    defaultMessage: 'Loading events...',
  }),
  noEventsMessage: i18n.translate('xpack.streams.sigEventsList.noEventsMessage', {
    defaultMessage: 'No significant events found',
  }),
  moreLabel: i18n.translate('xpack.streams.columns.moreTextLabel', {
    defaultMessage: 'more',
  }),
  columns: {
    timestamp: i18n.translate('xpack.streams.sigEventsList.timestampColumn', {
      defaultMessage: 'Timestamp',
    }),
    verdict: i18n.translate('xpack.streams.sigEventsList.verdictColumn', {
      defaultMessage: 'Verdict',
    }),
    title: i18n.translate('xpack.streams.sigEventsList.titleColumn', {
      defaultMessage: 'Title',
    }),
    streams: i18n.translate('xpack.streams.sigEventsList.streamsColumn', {
      defaultMessage: 'Streams',
    }),
    impact: i18n.translate('xpack.streams.sigEventsList.impactColumn', {
      defaultMessage: 'Impact',
    }),
    criticality: i18n.translate('xpack.streams.sigEventsList.criticalityColumn', {
      defaultMessage: 'Criticality',
    }),
    action: i18n.translate('xpack.streams.sigEventsList.actionColumn', {
      defaultMessage: 'Action',
    }),
  },
  flyout: {
    criticality: i18n.translate('xpack.streams.eventFlyout.criticality', {
      defaultMessage: 'Criticality',
    }),
    impact: i18n.translate('xpack.streams.eventFlyout.impact', {
      defaultMessage: 'Impact',
    }),
    action: i18n.translate('xpack.streams.eventFlyout.action', {
      defaultMessage: 'Recommended Action',
    }),
    lastReviewed: i18n.translate('xpack.streams.eventFlyout.lastReviewed', {
      defaultMessage: 'Last Reviewed',
    }),
    streams: i18n.translate('xpack.streams.eventFlyout.streamsTitle', {
      defaultMessage: 'Streams',
    }),
    summary: i18n.translate('xpack.streams.eventFlyout.summaryTitle', {
      defaultMessage: 'Summary',
    }),
    rootCause: i18n.translate('xpack.streams.eventFlyout.rootCauseTitle', {
      defaultMessage: 'Root Cause',
    }),
    recommendations: i18n.translate('xpack.streams.eventFlyout.recommendationsTitle', {
      defaultMessage: 'Recommendations',
    }),
    rules: i18n.translate('xpack.streams.eventFlyout.rulesTitle', {
      defaultMessage: 'Rules',
    }),
    close: i18n.translate('xpack.streams.eventFlyout.closeButton', {
      defaultMessage: 'Close',
    }),
  },
};
