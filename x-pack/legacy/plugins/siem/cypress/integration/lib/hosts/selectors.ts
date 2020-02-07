/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/** The `All Hosts` widget on the `Hosts` page */
export const ALL_HOSTS_WIDGET = '[data-test-subj="table-allHosts-loading-false"]';

/** A single draggable host in the `All Hosts` widget on the `Hosts` page */
export const ALL_HOSTS_WIDGET_HOST = '[data-test-subj="draggable-content-host.name"]';

/** All the draggable hosts in the `All Hosts` widget on the `Hosts` page */
export const ALL_HOSTS_WIDGET_DRAGGABLE_HOSTS = `${ALL_HOSTS_WIDGET} ${ALL_HOSTS_WIDGET_HOST}`;

/** Clicking this button displays the `Events` tab */
export const EVENTS_TAB_BUTTON = '[data-test-subj="navigation-events"]';

export const NAVIGATION_HOSTS_ALL_HOSTS = '[data-test-subj="navigation-allHosts"]';

export const NAVIGATION_HOSTS_ANOMALIES = '[data-test-subj="navigation-anomalies"]';
