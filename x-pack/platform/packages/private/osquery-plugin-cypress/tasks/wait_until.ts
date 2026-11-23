/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const waitUntil = (fn: () => Cypress.Chainable) => {
  const timeout = 120000;
  const interval = 5000;
  let attempts = timeout / interval;

  const completeOrRetry = (result: Cypress.Chainable) => {
    if (result) {
      return result;
    }

    if (attempts < 1) {
      throw new Error(`Timed out while retrying, last result was: {${result}}`);
    }

    cy.wait(interval, { log: false }).then(() => {
      attempts--;

      return evaluate();
    });
  };

  const evaluate = () => {
    const result = fn();

    if (result && result.then) {
      return result.then(completeOrRetry);
    } else {
      return completeOrRetry(result);
    }
  };

  return evaluate();
};
