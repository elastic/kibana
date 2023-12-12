/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import 'cypress-axe';
import URL from 'url';
import { AXE_CONFIG, AXE_OPTIONS } from '@kbn/axe-config';

// FIXME: move this to a package
Cypress.Commands.add('getByTestSubj', (selector: string) => {
  return cy.get(`[data-test-subj="${selector}"]`);
});

// FIXME: move this to a package
Cypress.Commands.add('visitKibana', (url, query) => {
  const urlPath = URL.format({
    pathname: url,
    query,
  });

  cy.visit(urlPath);
  cy.getByTestSubj('kbnLoadingMessage').should('exist');
  cy.getByTestSubj('kbnLoadingMessage').should('not.exist', {
    timeout: 50000,
  });
});

// A11y configuration

const axeConfig = {
  ...AXE_CONFIG,
};
const axeOptions = {
  ...AXE_OPTIONS,
  runOnly: [...AXE_OPTIONS.runOnly, 'best-practice'],
};

/**
 * To use within E2E tests
 */
export const checkA11y = ({ skipFailures }: { skipFailures: boolean }) => {
  // https://github.com/component-driven/cypress-axe#cychecka11y
  cy.injectAxe();
  cy.configureAxe(axeConfig);
  const context = '.kbnAppWrapper'; // Scopes a11y checks to only our app
  /**
   * We can get rid of the last two params when we don't need to add skipFailures
   * params = (context, options, violationCallback, skipFailures)
   */
  cy.checkA11y(context, axeOptions, undefined, skipFailures);
};
