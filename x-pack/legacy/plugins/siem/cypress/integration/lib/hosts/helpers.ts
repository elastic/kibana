/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_TIMEOUT } from '../util/helpers';

import { ALL_HOSTS_WIDGET } from './selectors';

/** Wait for the for the `All Hosts` widget on the `Hosts` page to load */
export const waitForAllHostsWidget = () => cy.get(ALL_HOSTS_WIDGET, { timeout: DEFAULT_TIMEOUT });
