/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const ALERTS_COUNT_BY = (groupByField: string) =>
  i18n.translate('xpack.siem.overview.alertsCountByTitle', {
    values: { groupByField },
    defaultMessage: 'Alerts count by {groupByField}',
  });

export const ALERTS_GRAPH_TITLE = i18n.translate('xpack.siem.overview.alertsGraphTitle', {
  defaultMessage: 'Alert detection frequency',
});

export const EVENTS_COUNT_BY = (groupByField: string) =>
  i18n.translate('xpack.siem.overview.eventsCountByTitle', {
    values: { groupByField },
    defaultMessage: 'Events count by {groupByField}',
  });

export const NEWS_FEED_TITLE = i18n.translate('xpack.siem.overview.newsFeedSidebarTitle', {
  defaultMessage: 'Security news',
});

export const PAGE_TITLE = i18n.translate('xpack.siem.overview.pageTitle', {
  defaultMessage: 'SIEM',
});

export const PAGE_SUBTITLE = i18n.translate('xpack.siem.overview.pageSubtitle', {
  defaultMessage: 'Security Information & Event Management with the Elastic Stack',
});

export const RECENT_TIMELINES = i18n.translate('xpack.siem.overview.recentTimelinesSidebarTitle', {
  defaultMessage: 'Recent timelines',
});

export const SIGNALS_BY_CATEGORY = i18n.translate('xpack.siem.overview.signalsByCategoryTitle', {
  defaultMessage: 'Signals count by MITRE ATT&CK\\u2122 category',
});

export const VIEW_ALERTS = i18n.translate('xpack.siem.overview.viewAlertsButtonLabel', {
  defaultMessage: 'View alerts',
});

export const VIEW_EVENTS = i18n.translate('xpack.siem.overview.viewEventsButtonLabel', {
  defaultMessage: 'View events',
});
