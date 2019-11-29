/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/** The default time in ms to wait for a Cypress command to complete */
export const DEFAULT_TIMEOUT = 30 * 1000;

export const waitForTableLoad = (dataTestSubj: string) =>
  cy.get(dataTestSubj, { timeout: DEFAULT_TIMEOUT });
