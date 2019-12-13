/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/** A data provider rendered in the timeline's data providers drop area */
export const DATA_PROVIDER = '[data-test-subj="providerContainer"]';

/** Data providers are dropped and rendered in this area of the timeline */
export const TIMELINE_DATA_PROVIDERS = '[data-test-subj="dataProviders"]';

/** The empty data providers area when no data providers have been added to the timeline */
export const TIMELINE_DATA_PROVIDERS_EMPTY =
  '[data-test-subj="dataProviders"] [data-test-subj="empty"]';

/** Data providers that were dropped on a timeline */
export const TIMELINE_DROPPED_DATA_PROVIDERS = `${TIMELINE_DATA_PROVIDERS} ${DATA_PROVIDER}`;

/** The `Timeline ^` button that toggles visibility of the Timeline */
export const TIMELINE_TOGGLE_BUTTON = '[data-test-subj="flyoutOverlay"]';

/** The flyout button shown when a data provider is not ready to be dropped on the timeline */
export const TIMELINE_NOT_READY_TO_DROP_BUTTON =
  '[data-test-subj="flyout-button-not-ready-to-drop"]';

/** Contains the KQL bar for searching or filtering in the timeline */
export const SEARCH_OR_FILTER_CONTAINER =
  '[data-test-subj="timeline-search-or-filter-search-container"]';

/** The total server-side count of the events matching the timeline's search criteria */
export const SERVER_SIDE_EVENT_COUNT = '[data-test-subj="server-side-event-count"]';

/** Expands or collapses an event in the timeline */
export const TOGGLE_TIMELINE_EXPAND_EVENT = '[data-test-subj="expand-event"]';

/** The body of the timeline flyout */
export const TIMELINE_FLYOUT_BODY = '[data-test-subj="eui-flyout-body"]';
