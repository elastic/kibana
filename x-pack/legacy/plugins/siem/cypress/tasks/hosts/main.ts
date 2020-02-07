/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_TIMEOUT } from '../../integration/lib/util/helpers';

import { EVENTS_TAB } from '../../screens/hosts/main';

/** Clicks the Events tab on the hosts page */
export const openEvents = () =>
  cy.get(EVENTS_TAB, { timeout: DEFAULT_TIMEOUT }).click({ force: true });
