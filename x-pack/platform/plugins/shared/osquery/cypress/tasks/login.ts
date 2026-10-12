/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServerlessRoleName } from '../support/roles';

import { request, suppressGlobalAnnouncements } from './common';

// Every flow the Security Solution app requests while rendering a page: `init-*` from
// `public/app/home`, `create-list-indices` from the lists config, `security-data-views`
// from the data view manager.
const SECURITY_SOLUTION_INITIALIZATION_FLOWS = [
  'create-list-indices',
  'security-data-views',
  'init-prebuilt-rules',
  'init-endpoint-protection',
  'init-ai-prompts',
  'init-detection-rule-monitoring',
] as const;

// Matches the route's own `INITIALIZE_SECURITY_SOLUTION_SOCKET_TIMEOUT_MS`: on a cold
// stack the flows install three bundled Fleet packages.
const INITIALIZE_TIMEOUT_MS = 2 * 60 * 1000;

/** Logs in as a SOC_MANAGER and provisions the Security Solution assets the osquery specs build on, through the same endpoint the app calls on its first render. */
export const initializeDataViews = (): Cypress.Chainable<Cypress.Response<unknown>> => {
  cy.login(ServerlessRoleName.SOC_MANAGER);
  suppressGlobalAnnouncements();

  return request({
    method: 'POST',
    url: '/api/security_solution/initialize',
    body: { flows: SECURITY_SOLUTION_INITIALIZATION_FLOWS },
    headers: { 'Elastic-Api-Version': '2023-10-31' },
    timeout: INITIALIZE_TIMEOUT_MS,
  });
};
