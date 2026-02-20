/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const getPromoteAllSuccessToast = (count: number) =>
  i18n.translate('xpack.streams.significantEventsDiscovery.queriesTable.promoteAllSuccess', {
    defaultMessage: 'Promoted {count} {count, plural, one {query} other {queries}}',
    values: { count },
  });

export const PROMOTE_ALL_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.promoteAllErrorTitle',
  { defaultMessage: 'Failed to promote queries' }
);

export const TITLE_COLUMN = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.titleColumn',
  {
    defaultMessage: 'Title',
  }
);

export const STREAM_COLUMN = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.streamColumn',
  {
    defaultMessage: 'Stream',
  }
);

export const BACKED_STATUS_COLUMN = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.backedStatusColumn',
  {
    defaultMessage: 'Status',
  }
);

export const IMPACT_COLUMN = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.impactColumn',
  {
    defaultMessage: 'Impact',
  }
);

export const LAST_OCCURRED_COLUMN = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.lastOccurredColumn',
  {
    defaultMessage: 'Last occurred',
  }
);

export const OCCURRENCES_COLUMN = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.occurrencesColumn',
  {
    defaultMessage: 'Occurrences',
  }
);

export const OCCURRENCES_TOOLTIP_NAME = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.occurrencesTooltipName',
  { defaultMessage: 'Occurrences' }
);

export const PROMOTED_BADGE_LABEL = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.promotedBadgeLabel',
  {
    defaultMessage: 'Scanning',
  }
);

export const NOT_PROMOTED_BADGE_LABEL = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.notPromotedBadgeLabel',
  {
    defaultMessage: 'Not scanning',
  }
);

export const PROMOTED_TOOLTIP_CONTENT = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.promotedTooltipContent',
  {
    defaultMessage: 'This query is used to scan for significant events in the background',
  }
);

export const NOT_PROMOTED_TOOLTIP_CONTENT = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.notPromotedTooltipContent',
  {
    defaultMessage: 'This query is not used to scan for significant events in the background',
  }
);

export const getPromoteAllCalloutTitle = (count: number) =>
  i18n.translate('xpack.streams.significantEventsDiscovery.queriesTable.promoteAllCalloutTitle', {
    defaultMessage:
      '{count} {count, plural, one {query is} other {queries are}} ready for promotion',
    values: { count },
  });

export const PROMOTE_ALL_CALLOUT_DESCRIPTION = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.promoteAllCalloutDescription',
  {
    defaultMessage:
      'Enable scheduled runs for these queries so their results are saved as Significant events, powering Insight generation.',
  }
);

export const PROMOTE_ALL_BUTTON = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.promoteAllButton',
  { defaultMessage: 'Promote all' }
);

export const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.searchPlaceholder',
  { defaultMessage: 'Search' }
);

export const CHART_TITLE = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.chart.title',
  {
    defaultMessage: 'Detected event occurrences',
  }
);

export const CHART_SERIES_NAME = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.chart.seriesName',
  {
    defaultMessage: 'Occurrences',
  }
);

export const getEventsCount = (count: number) =>
  i18n.translate('xpack.streams.significantEventsDiscovery.queriesTable.eventsCount', {
    defaultMessage: '{count} Queries',
    values: { count },
  });

export const TABLE_CAPTION = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.tableCaption',
  { defaultMessage: 'Queries table' }
);

export const NO_ITEMS_MESSAGE = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.noItemsMessage',
  {
    defaultMessage: 'No queries found',
  }
);

export const UNABLE_TO_LOAD_QUERIES_TITLE = i18n.translate(
  'xpack.streams.queriesTable.loadingError.title',
  { defaultMessage: 'Unable to load queries' }
);

export const UNABLE_TO_LOAD_QUERIES_BODY = i18n.translate(
  'xpack.streams.queriesTable.loadingError.body',
  {
    defaultMessage: "Try refreshing the page or contact support if error doesn't go away",
  }
);

export const ACTIONS_COLUMN_TITLE = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.actionsColumnTitle',
  { defaultMessage: 'Actions' }
);

export const DETAILS_BUTTON_ARIA_LABEL = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.detailsButtonAriaLabel',
  { defaultMessage: 'View details' }
);

export const OPEN_IN_DISCOVER_ACTION_TITLE = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.openInDiscoverActionTitle',
  { defaultMessage: 'Open in Discover' }
);

export const OPEN_IN_DISCOVER_ACTION_DESCRIPTION = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.openInDiscoverActionDescription',
  { defaultMessage: 'Open query in Discover' }
);

export const PROMOTE_QUERY_ACTION_TITLE = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.promoteQueryActionTitle',
  { defaultMessage: 'Promote' }
);

export const PROMOTE_QUERY_ACTION_DESCRIPTION = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.promoteQueryActionDescription',
  {
    defaultMessage: 'Start scanning this query in the background for significant events',
  }
);

export const getPromoteQuerySuccessToast = (queryTitle: string) =>
  i18n.translate('xpack.streams.significantEventsDiscovery.queriesTable.promoteQuerySuccess', {
    defaultMessage: 'Promoted "{queryTitle}". It moved to the Scanning section.',
    values: { queryTitle },
  });

export const SAVE_QUERY_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.saveQueryErrorToastTitle',
  { defaultMessage: 'Failed to save query' }
);

export const DELETE_QUERY_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.deleteQueryErrorToastTitle',
  { defaultMessage: 'Failed to delete query' }
);
