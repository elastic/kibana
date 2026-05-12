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
  streamFilter: i18n.translate('xpack.streams.sigEventsList.streamFilter', {
    defaultMessage: 'Stream',
  }),
  streamPopoverAriaLabel: i18n.translate('xpack.streams.sigEventsList.streamPopoverAriaLabel', {
    defaultMessage: 'Filter by stream',
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
    lifecycle: i18n.translate('xpack.streams.eventFlyout.lifecycle', {
      defaultMessage: 'Lifecycle',
    }),
    close: i18n.translate('xpack.streams.eventFlyout.closeButton', {
      defaultMessage: 'Close',
    }),
    lifecycleError: i18n.translate('xpack.streams.eventFlyout.lifecycleError', {
      defaultMessage: 'Failed to load lifecycle data',
    }),
  },
  fetchError: i18n.translate('xpack.streams.sigEventsList.fetchError', {
    defaultMessage: 'Failed to load significant events',
  }),
  lifecycle: {
    detectionStep: i18n.translate('xpack.streams.lifecycle.detectionStep', {
      defaultMessage: 'Detection',
    }),
    discoveryStep: i18n.translate('xpack.streams.lifecycle.discoveryStep', {
      defaultMessage: 'Discovery',
    }),
    verdictStep: i18n.translate('xpack.streams.lifecycle.verdictStep', {
      defaultMessage: 'Verdict',
    }),
    eventCreated: i18n.translate('xpack.streams.lifecycle.eventCreated', {
      defaultMessage: 'Event Created',
    }),
    eventsDetected: i18n.translate('xpack.streams.lifecycle.eventsDetected', {
      defaultMessage: 'events detected',
    }),
    confidence: i18n.translate('xpack.streams.lifecycle.confidence', {
      defaultMessage: 'Confidence',
    }),
    criticality: i18n.translate('xpack.streams.lifecycle.criticality', {
      defaultMessage: 'Criticality',
    }),
    impact: i18n.translate('xpack.streams.lifecycle.impact', {
      defaultMessage: 'Impact',
    }),
    rootCause: i18n.translate('xpack.streams.lifecycle.rootCause', {
      defaultMessage: 'Root Cause',
    }),
    evidences: i18n.translate('xpack.streams.lifecycle.evidences', {
      defaultMessage: 'Evidence',
    }),
    dependencies: i18n.translate('xpack.streams.lifecycle.dependencies', {
      defaultMessage: 'Dependencies',
    }),
    infraComponents: i18n.translate('xpack.streams.lifecycle.infraComponents', {
      defaultMessage: 'Infrastructure',
    }),
    causeKis: i18n.translate('xpack.streams.lifecycle.causeKis', {
      defaultMessage: 'Cause KIs',
    }),
    assessmentNote: i18n.translate('xpack.streams.lifecycle.assessmentNote', {
      defaultMessage: 'Assessment',
    }),
    recommendations: i18n.translate('xpack.streams.lifecycle.recommendations', {
      defaultMessage: 'Recommendations',
    }),
    noData: i18n.translate('xpack.streams.lifecycle.noData', {
      defaultMessage: 'No data available',
    }),
    superseded: i18n.translate('xpack.streams.lifecycle.superseded', {
      defaultMessage: 'superseded',
    }),
    confirmed: i18n.translate('xpack.streams.lifecycle.confirmed', {
      defaultMessage: 'confirmed',
    }),
    viewConversation: i18n.translate('xpack.streams.lifecycle.viewConversation', {
      defaultMessage: 'View AI reasoning',
    }),
    pValueTooltip: i18n.translate('xpack.streams.lifecycle.pValueTooltip', {
      defaultMessage:
        'Statistical significance of the change point. Lower = more significant. 0 = extreme.',
    }),
    exposed: i18n.translate('xpack.streams.lifecycle.exposed', {
      defaultMessage: 'exposed',
    }),
    rawDocument: i18n.translate('xpack.streams.lifecycle.rawDocument', {
      defaultMessage: 'Raw document',
    }),
  },
};
