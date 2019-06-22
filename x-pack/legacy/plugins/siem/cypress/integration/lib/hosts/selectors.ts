/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/** The `All Hosts` widget on the `Hosts` page */
export const ALL_HOSTS_WIDGET = '[data-test-subj="all-hosts"]';

/** A single draggable host in the `All Hosts` widget on the `Hosts` page */
export const ALL_HOSTS_WIDGET_HOST = '[data-react-beautiful-dnd-drag-handle]';

/** All the draggable hosts in the `All Hosts` widget on the `Hosts` page */
export const ALL_HOSTS_WIDGET_DRAGGABLE_HOSTS = `${ALL_HOSTS_WIDGET} ${ALL_HOSTS_WIDGET_HOST}`;
