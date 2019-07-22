/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ALL_HOSTS_WIDGET } from './selectors';

/** Wait this long for the for the `All Hosts` widget on the `Hosts` page to load */
const ALL_HOSTS_TIMEOUT = 10 * 1000;

/** Wait for the for the `All Hosts` widget on the `Hosts` page to load */
export const waitForAllHostsWidget = () => cy.get(ALL_HOSTS_WIDGET, { timeout: ALL_HOSTS_TIMEOUT });
