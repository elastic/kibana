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

    cy.getByTestSubj('helloWorldDiv').as('resultContainer');
    cy.getByTestSubj('helloWorldTextHandle').as('textHandle');
    cy.getByTestSubj('helloWorldResetHandle').as('resetHandle');

    // initial
    cy.get('@resultContainer').contains('Hello Worlff!');

    // updated
    cy.get('@textHandle').clear().type('Spider-Man');
    cy.get('@resultContainer').should('have.text', 'Hello Spider-Man!');

    // reset
    cy.get('@resetHandle').click();
    cy.get('@resultContainer').should('have.text', 'Hello World!');
  });
});

// Since there are no imports, we must use
// the empty export statement to make this a
// module rather than a global script.
export {};
