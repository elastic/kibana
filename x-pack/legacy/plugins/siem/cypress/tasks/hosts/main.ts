/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_TIMEOUT } from '../../integration/lib/util/helpers';

import {
  EVENTS_TAB,
  AUTHENTICATIONS_TAB,
  UNCOMMON_PROCESSES_TAB,
  ALL_HOSTS_TAB,
} from '../../screens/hosts/main';

/** Clicks the Events tab on the hosts page */
export const openEvents = () =>
  cy.get(EVENTS_TAB, { timeout: DEFAULT_TIMEOUT }).click({ force: true });

export const openAuthentications = () =>
  cy.get(AUTHENTICATIONS_TAB, { timeout: DEFAULT_TIMEOUT }).click({ force: true });

export const openUncommonProcesses = () =>
  cy.get(UNCOMMON_PROCESSES_TAB, { timeout: DEFAULT_TIMEOUT }).click({ force: true });

export const openAllHosts = () =>
  cy.get(ALL_HOSTS_TAB, { timeout: DEFAULT_TIMEOUT }).click({ force: true });
