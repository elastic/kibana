/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/** The `Timeline ^` button that toggles visibility of the Timeline */
export const TIMELINE_TOGGLE_BUTTON = '[data-test-subj="flyoutOverlay"]';

/** Contains the KQL bar for searching or filtering in the timeline */
export const SEARCH_OR_FILTER_CONTAINER =
  '[data-test-subj="timeline-search-or-filter-search-container"]';

export const TIMELINE_FIELDS_BUTTON =
  '[data-test-subj="timeline"] [data-test-subj="show-field-browser"]';

/** The total server-side count of the events matching the timeline's search criteria */
export const SERVER_SIDE_EVENT_COUNT = '[data-test-subj="server-side-event-count"]';

export const TIMELINE_SETTINGS_ICON = '[data-test-subj="settings-gear"]';

export const TIMELINE_INSPECT_BUTTON = '[data-test-subj="inspect-empty-button"]';
