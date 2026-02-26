/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const triggerLoadData = () => {
  // Wait for the waffle map nodes to load, then click on a non-fleet-server node
  // @ts-expect-error update types for multiple true
  cy.getBySel('nodeContainer', { multiple: true, timeout: 60000 })
    .not(':contains("dev-fleet-server")')
    .first()
    .should('exist')
    .click();
};
