/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/** The panel containing the events viewer */
export const EVENTS_VIEWER_PANEL = '[data-test-subj="events-viewer-panel"]';

/** Clicking this button in the timeline opens the Fields browser in the Events Viewer */
export const EVENTS_VIEWER_FIELDS_BUTTON = `${EVENTS_VIEWER_PANEL} [data-test-subj="show-field-browser-gear"]`;

/** The KQL search bar that exists at the top of most pages */
export const KQL_SEARCH_BAR = '[data-test-subj="queryInput"]';

/** The Events Viewer Showing N events header subtitle */
export const HEADER_SUBTITLE = `${EVENTS_VIEWER_PANEL} [data-test-subj="header-panel-subtitle"]`;

/** The inspect query modal */
export const INSPECT_MODAL = '[data-test-subj="modal-inspect-euiModal"]';

export const CLOSE_MODAL = '[data-test-subj="modal-inspect-close"]';

/** The inspect query button that launches the inspect query modal */
export const INSPECT_QUERY = `${EVENTS_VIEWER_PANEL} [data-test-subj="inspect-icon-button"]`;

/** A count of the events loaded in the table */
export const LOCAL_EVENTS_COUNT = `${EVENTS_VIEWER_PANEL} [data-test-subj="local-events-count"]`;

/** The events viewer Load More button */
export const LOAD_MORE = `${EVENTS_VIEWER_PANEL} [data-test-subj="TimelineMoreButton"]`;
