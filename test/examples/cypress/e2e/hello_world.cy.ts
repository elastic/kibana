/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

describe('Hello World example app', () => {
  it('says hello to user', () => {
    cy.visitKibana('/app/helloWorld');

    // initial
    cy.getByTestSubj('helloWorldDiv').as('result');
    cy.get('@result').contains('Hello World!');

    // updated
    cy.getByTestSubj('helloWorldTextHandle').clear().type('Spider-Man');
    cy.get('@result').should('have.text', 'Hello Spider-Man!');

    // reset
    cy.getByTestSubj('helloWorldResetHandle').click();
    cy.get('@result').should('have.text', 'Hello World!');
  });
});
