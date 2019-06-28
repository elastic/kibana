/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { drag, drop } from '../drag_n_drop/helpers';
import { ALL_HOSTS_WIDGET_DRAGGABLE_HOSTS } from '../hosts/selectors';

import { TIMELINE_DATA_PROVIDERS, TIMELINE_TOGGLE_BUTTON } from './selectors';

/** Wait up to this many ms for the timeline to render data providers that were dropped in the timeline */
export const TIMELINE_RENDER_DATA_PROVIDERS_TIMEOUT = 10 * 1000;

/** Toggles the timeline's open / closed state by clicking the `T I M E L I N E` button */
export const toggleTimelineVisibility = () =>
  cy
    .get(TIMELINE_TOGGLE_BUTTON)
    .first()
    .click();

/** Drags and drops a host from the `All Hosts` widget on the `Hosts` page to the timeline */
export const dragFromAllHostsToTimeline = () => {
  cy.get(ALL_HOSTS_WIDGET_DRAGGABLE_HOSTS)
    .first()
    .then(host => drag(host));

  cy.get(TIMELINE_DATA_PROVIDERS)
    .first()
    .then(dataProvidersDropArea => drop(dataProvidersDropArea));
};
