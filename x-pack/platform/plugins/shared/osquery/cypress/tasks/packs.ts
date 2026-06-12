/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { closeModalIfVisible, closeToastIfVisible } from './integrations';

export const preparePack = (packName: string) => {
  cy.contains('Packs').click();
  cy.getBySel('tablePaginationPopoverButton').click();
  cy.getBySel('tablePagination-50-rows').click();
  const createdPack = cy.contains(packName);
  createdPack.click();
};

export const changePackActiveStatus = (packName: string) => {
  const regex = new RegExp(`Successfully (activated|deactivated) "${packName}" pack`);

  cy.getBySel('globalLoadingIndicator').should('not.exist');
  cy.get(`[aria-label="${packName}"]`).click();
  closeModalIfVisible();
  cy.contains(regex).should('not.exist');
  cy.contains(regex).should('exist');
  closeToastIfVisible();
  cy.contains(regex).should('not.exist');
};
