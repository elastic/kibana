/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const API_AUTH = {
  user: Cypress.env('KIBANA_USERNAME') ?? Cypress.env('ELASTICSEARCH_USERNAME'),
  pass: Cypress.env('KIBANA_PASSWORD') ?? Cypress.env('ELASTICSEARCH_PASSWORD'),
};

const API_HEADERS = {
  'kbn-xsrf': 'cypress',
  'x-elastic-internal-origin': 'security-solution',
};

export const request = <T = unknown>(
  options: Partial<Cypress.RequestOptions>
): Cypress.Chainable<Cypress.Response<T>> =>
  cy.request<T>({
    auth: API_AUTH,
    ...options,
    headers: { ...API_HEADERS, ...options.headers },
  });

/** Persist global `hideAnnouncements` (agent builder announcement modal). */
export const suppressGlobalAnnouncements = (): Cypress.Chainable<Cypress.Response<unknown>> =>
  request({
    method: 'POST',
    url: '/internal/kibana/global_settings',
    body: { changes: { hideAnnouncements: true } },
    failOnStatusCode: false,
  });
