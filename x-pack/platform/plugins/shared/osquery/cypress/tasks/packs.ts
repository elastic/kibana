/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { recurse } from 'cypress-recurse';
import { closeModalIfVisible, closeToastIfVisible } from './integrations';
import { POLICY_ASSIGNMENT_SEARCH, POLICY_ASSIGNMENT_TABLE } from '../screens/packs';
import { navigateTo } from './navigation';

export const preparePack = (packName: string) => {
  cy.contains('Packs').click();
  cy.getBySel('tablePaginationPopoverButton').click();
  cy.getBySel('tablePagination-50-rows').click();
  const createdPack = cy.contains(packName);
  createdPack.click();
};

/**
 * The read-only "Pack details" page was removed. The per-query scheduled
 * results (docs counts, "View in Lens"/"View in Discover" actions) that used to
 * live there now surface on the scheduled-execution details page, reached from
 * the History tab. This polls History until the scheduled execution for the
 * given pack is indexed, then opens its details page.
 */
export const openScheduledPackExecutionDetails = (packName: string) => {
  navigateTo('/app/osquery');

  // Scheduled results take a while to be indexed by ES, so we reload between
  // attempts (same approach as the legacy details poll).
  recurse<number>(
    () =>
      cy
        .getBySel('unifiedHistoryTable')
        .then(($table) => $table.find('tr:contains("' + packName + '")').length),
    (rowCount) => rowCount > 0,
    {
      timeout: 300000,
      post: () => {
        cy.reload();
      },
    }
  );

  // Open the scheduled execution's details page via the row's "Details" action
  // button (EuiButtonIcon with aria-label "Details" from HistoryDetailsButton
  // in unified_history_table.tsx).
  cy.contains('.euiTableRow', packName)
    .find('[aria-label="Details"]')
    .first()
    .should('be.visible')
    .click();

  // Scheduled execution details use the AppHeader back control to History.
  cy.getBySel('appHeaderBack').should('exist');
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

/**
 * Selects an agent policy in the pack form's policy assignment list.
 *
 * Replaces the former `policyIdsComboBox` interaction. The list keeps selection
 * in form state rather than in `EuiInMemoryTable`'s built-in `selection` prop,
 * so the checkbox is an ordinary cell: narrow the table with the search box,
 * then tick the checkbox by its accessible name, which is exact per policy.
 */
export const selectPackPolicy = (policyName: string) => {
  cy.getBySel(POLICY_ASSIGNMENT_TABLE).should('exist');
  cy.getBySel(POLICY_ASSIGNMENT_SEARCH).clear().type(policyName);

  cy.get(`input[type="checkbox"][aria-label="Select policy ${policyName}"]`)
    .should('not.be.disabled')
    .check()
    .should('be.checked');

  // Clear the filter so later assertions see the full list again.
  cy.getBySel(POLICY_ASSIGNMENT_SEARCH).clear();
};
