/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IPS_TABLE_LOADED } from '../../screens/network/flows';

export const waitForIpsTableToBeLoaded = () => {
  cy.get(IPS_TABLE_LOADED).should('exist');
};
