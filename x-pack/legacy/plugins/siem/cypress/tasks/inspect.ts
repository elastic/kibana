/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { INSPECT_BUTTON_ICON, InspectButtonMetadata } from '../screens/inspect';

import { DEFAULT_TIMEOUT } from '../tasks/login';

export const closesModal = () => {
  cy.get('[data-test-subj="modal-inspect-close"]', { timeout: DEFAULT_TIMEOUT }).click();
};

export const openStatsAndTables = (table: InspectButtonMetadata) => {
  if (table.tabId) {
    cy.get(table.tabId).click({ force: true });
  }
  cy.get(table.id, { timeout: DEFAULT_TIMEOUT });
  if (table.altInspectId) {
    cy.get(table.altInspectId, { timeout: DEFAULT_TIMEOUT }).trigger('click', {
      force: true,
    });
  } else {
    cy.get(`${table.id} ${INSPECT_BUTTON_ICON}`, {
      timeout: DEFAULT_TIMEOUT,
    }).trigger('click', { force: true });
  }
};
