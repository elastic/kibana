/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const logout = (): null => {
  cy.request({
    method: 'GET',
    url: `${Cypress.config().baseUrl}/logout`,
  }).then(response => {
    expect(response.status).to.eq(200);
  });
  return null;
};
