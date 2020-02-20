/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IPS_TABLE_LOADED } from '../../screens/network/flows';
import { DEFAULT_TIMEOUT } from '../../tasks/login';

export const waitForIpsTableToBeLoaded = () => {
  cy.get(IPS_TABLE_LOADED, { timeout: DEFAULT_TIMEOUT }).should('exist');
};
