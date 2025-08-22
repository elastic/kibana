/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const NO_EVENTS = i18n.translate('xpack.cases.caseView.events.noeventsAvailable', {
  defaultMessage: 'No events available',
});

export const SHOWING_EVENTS = (totalevents: number) =>
  i18n.translate('xpack.cases.caseView.events.showingeventsTitle', {
    values: { totalevents },
    defaultMessage: 'Showing {totalevents} {totalevents, plural, =1 {event} other {events}}',
  });

export const EVENTS_TABLE = i18n.translate('xpack.cases.caseView.events.eventsTable', {
  defaultMessage: 'Events table',
});

export const SEARCH_PLACEHOLDER = i18n.translate('xpack.cases.caseView.events.searchPlaceholder', {
  defaultMessage: 'Search events',
});

export const DATE_ADDED = i18n.translate('xpack.cases.caseView.events.dateAdded', {
  defaultMessage: 'Date added',
});

export const EVENT_VALUE = i18n.translate('xpack.cases.caseView.events.value', {
  defaultMessage: 'Event value',
});

export const VALUE_PLACEHOLDER = i18n.translate('xpack.cases.caseView.events.valuePlaceholder', {
  defaultMessage: 'Event value',
});

export const DATA_VIEW_ERROR = i18n.translate('xpack.cases.caseView.events.dataViewError', {
  defaultMessage: 'Data view error',
});
