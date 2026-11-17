/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
import 'cypress-axe';
import { AXE_CONFIG, AXE_OPTIONS } from '@kbn/axe-config';

const axeConfig = {
  ...AXE_CONFIG,
};
const axeOptions = {
  ...AXE_OPTIONS,
  runOnly: [...AXE_OPTIONS.runOnly, 'best-practice'],
};

/**
 * Injects axe-core into the page for accessibility testing.
 * Uses a Cypress task to get the axe-core source from Node context,
 * bypassing the webpack preprocessor issue with require.resolve().
 * See: https://github.com/component-driven/cypress-axe/issues/84
 */
const injectAxeFromTask = () => {
  cy.task('getAxeCoreSource', null, { log: false }).then((axeSource) => {
    cy.window({ log: false }).then((win) => {
      win.eval(axeSource as string);
    });
  });
};

/**
 * Runs accessibility checks using Axe.
 *
 * @param options - Configuration options for the accessibility check.
 * @param options.skipFailures - **@deprecated** Use of this option is discouraged. It may be used temporarily, but please ensure that all identified issues are addressed promptly.
 */
export const checkA11y = ({ skipFailures }: { skipFailures?: true } = {}) => {
  // https://github.com/component-driven/cypress-axe#cychecka11y
  injectAxeFromTask();
  cy.configureAxe(axeConfig);
  const context = '.kbnAppWrapper'; // Scopes a11y checks to only our app
  /**
   * We can get rid of the last two params when we don't need to add skipFailures
   * params = (context, options, violationCallback, skipFailures)
   */
  cy.checkA11y(context, axeOptions, undefined, skipFailures ?? false);
};
