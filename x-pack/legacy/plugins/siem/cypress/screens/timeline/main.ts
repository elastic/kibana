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

export const CLOSE_TIMELINE_BTN = '[data-test-subj="close-timeline"]';

export const CREATE_NEW_TIMELINE = '[data-test-subj="timeline-new"]';

export const TIMELINE_DATA_PROVIDERS = '[data-test-subj="dataProviders"]';

export const TIMELINE_DATA_PROVIDERS_EMPTY =
  '[data-test-subj="dataProviders"] [data-test-subj="empty"]';

export const TIMELINE_DROPPED_DATA_PROVIDERS =
  '[data-test-subj="dataProviders"] [data-test-subj="providerContainer"]';

export const TIMELINE_FLYOUT_BODY = '[data-test-subj="eui-flyout-body"]';

export const TIMELINE_NOT_READY_TO_DROP_BUTTON =
  '[data-test-subj="flyout-button-not-ready-to-drop"]';

export const TOGGLE_TIMELINE_EXPAND_EVENT = '[data-test-subj="expand-event"]';

export const TIMESTAMP_TOGGLE_FIELD = '[data-test-subj="toggle-field-@timestamp"]';

export const ID_TOGGLE_FIELD = '[data-test-subj="toggle-field-_id"]';

export const TIMESTAMP_HEADER_FIELD = '[data-test-subj="header-text-@timestamp"]';

export const ID_HEADER_FIELD = '[data-test-subj="timeline"] [data-test-subj="header-text-_id"]';

export const ID_FIELD = '[data-test-subj="timeline"] [data-test-subj="field-name-_id"]';

export const TIMELINE_TITLE = '[data-test-subj="timeline-title"]';
