/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const elementShouldNotExist = (element: string) => {
  cy.get(element).should('not.exist');
};

export const elementShouldExist = (element: string) => {
  cy.get(element).should('exist');
};

export const elementShouldEqualText = (element: string, text: string) => {
  cy.get(element)
    .invoke('text')
    .should('eq', text);
};

export const elementShouldNotEqualText = (element: string, text: string | JQuery<HTMLElement>) => {
  cy.get(element)
    .invoke('text')
    .should('not.equal', text);
};

export const elementShouldBeChecked = (element: string) => {
  cy.get(element).should('be.checked');
};
