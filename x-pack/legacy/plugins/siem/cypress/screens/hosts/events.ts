/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const EVENTS_VIEWER_PANEL = '[data-test-subj="events-viewer-panel"]';

export const CLOSE_MODAL = '[data-test-subj="modal-inspect-close"]';

export const HEADER_SUBTITLE = `${EVENTS_VIEWER_PANEL} [data-test-subj="header-panel-subtitle"]`;

export const INSPECT_MODAL = '[data-test-subj="modal-inspect-euiModal"]';

export const INSPECT_QUERY = `${EVENTS_VIEWER_PANEL} [data-test-subj="inspect-icon-button"]`;

export const LOAD_MORE = `${EVENTS_VIEWER_PANEL} [data-test-subj="TimelineMoreButton"]`;

export const LOCAL_EVENTS_COUNT = `${EVENTS_VIEWER_PANEL} [data-test-subj="local-events-count"]`;

export const SERVER_SIDE_EVENT_COUNT = '[data-test-subj="server-side-event-count"]';

export const HOST_GEO_CITY_NAME_HEADER = '[data-test-subj="header-text-host.geo.city_name"]';

export const HOST_GEO_CITY_NAME_CHECKBOX = '[data-test-subj="field-host.geo.city_name-checkbox"]';

export const HOST_GEO_COUNTRY_NAME_HEADER = '[data-test-subj="header-text-host.geo.country_name"]';

export const HOST_GEO_COUNTRY_NAME_CHECKBOX =
  '[data-test-subj="field-host.geo.country_name-checkbox"]';

export const FIELDS_BROWSER_CONTAINER = '[data-test-subj="fields-browser-container"]';

export const EVENTS_VIEWER_FIELDS_BUTTON = `${EVENTS_VIEWER_PANEL} [data-test-subj="show-field-browser-gear"]`;

export const RESET_FIELDS = `${EVENTS_VIEWER_PANEL} [data-test-subj="reset-fields"]`;
