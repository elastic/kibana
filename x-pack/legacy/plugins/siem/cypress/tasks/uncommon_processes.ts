/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UNCOMMON_PROCESSES_TABLE } from '../screens/uncommon_processes';
import { DEFAULT_TIMEOUT } from '../tasks/login';

export const waitForUncommonProcessesToBeLoaded = () => {
  cy.get(UNCOMMON_PROCESSES_TABLE, { timeout: DEFAULT_TIMEOUT }).should('exist');
};
