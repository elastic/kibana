/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import URL from 'url';

Cypress.Commands.add('getByTestSubj', (selector: string) => {
  return cy.get(`[data-test-subj="${selector}"]`);
});

Cypress.Commands.add('visitKibana', (url, query) => {
  const urlPath = URL.format({
    pathname: url,
    query,
  });

  cy.visit(urlPath);

  cy.getByTestSubj('kbnLoadingMessage').as('loadingMessage');

  cy.get('@loadingMessage').should('exist');
  cy.get('@loadingMessage').should('not.exist', {
    timeout: 50000,
  });
});
