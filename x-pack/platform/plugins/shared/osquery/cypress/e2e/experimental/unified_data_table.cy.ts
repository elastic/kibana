/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { navigateTo } from '../../tasks/navigation';
import { inputQuery, selectAllAgents, submitQuery } from '../../tasks/live_query';
import { RESULTS_PANEL, RESULTS_TABLE, RESULTS_FLYOUT } from '../../screens/experimental';
import { ServerlessRoleName } from '../../support/roles';

describe(
  'EXPERIMENTAL - Unified Data Table (unifiedDataTable)',
  {
    tags: ['@ess', '@experimental'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.osquery.enableExperimental=${JSON.stringify([
            'queryHistoryRework',
            'unifiedDataTable',
          ])}`,
        ],
      },
    },
  },
  () => {
    it('should render and interact with the unified data table', () => {
      cy.login(ServerlessRoleName.SOC_MANAGER);
      navigateTo('/app/osquery/new');
      selectAllAgents();
      inputQuery('select * from uptime;');
      submitQuery();
      cy.getBySel(RESULTS_TABLE, { timeout: 240000 }).should('exist');

      // Results panel and table are rendered
      cy.getBySel(RESULTS_PANEL).should('exist');

      // Column headers are present
      cy.getBySel(RESULTS_TABLE)
        .find('[data-test-subj^="dataGridHeaderCell-"]')
        .should('have.length.greaterThan', 0);

      // KQL search bar is displayed
      cy.getBySel(RESULTS_PANEL).within(() => {
        cy.getBySel('osqueryResultsSearchBar').should('exist');
      });

      // Pagination controls are rendered
      cy.get('[data-test-subj="tablePaginationPopoverButton"]').should('exist');

      // KQL search with a matching filter keeps results visible
      cy.intercept('GET', '/api/osquery/live_queries/*/results/*').as('filteredResults');
      cy.getBySel('osqueryResultsSearchBar').type('agent.name: *');
      cy.getBySel('querySubmitButton').click();
      cy.wait('@filteredResults');
      cy.getBySel(RESULTS_TABLE).should('exist');
      cy.getBySel(RESULTS_TABLE).find('[role="row"]').should('have.length.greaterThan', 1);

      // KQL search with a non-matching filter yields empty state
      cy.intercept('GET', '/api/osquery/live_queries/*/results/*').as('noResults');
      cy.getBySel('osqueryResultsSearchBar')
        .clear({ force: true })
        .type('agent.name: "nonexistentagent"');
      cy.getBySel('querySubmitButton').click();
      cy.wait('@noResults');
      cy.contains('No results match your search criteria').should('exist');
      cy.getBySel(RESULTS_TABLE).should('not.exist');

      // Clearing the search restores all results
      cy.intercept('GET', '/api/osquery/live_queries/*/results/*').as('allResults');
      cy.getBySel('osqueryResultsSearchBar').clear({ force: true });
      cy.getBySel('querySubmitButton').click();
      cy.wait('@allResults');
      cy.getBySel(RESULTS_TABLE, { timeout: 30000 }).should('exist');
      cy.getBySel(RESULTS_TABLE).find('[role="row"]').should('have.length.greaterThan', 1);

      // Sorting: click the Sort fields button and verify it opens
      cy.getBySel(RESULTS_TABLE).within(() => {
        cy.getBySel('dataGridColumnSortingButton').click();
      });
      cy.get('[data-test-subj="dataGridColumnSortingPopover"]').should('exist');
      cy.get('body').type('{esc}');

      // Column selector control exists and lists columns
      cy.getBySel(RESULTS_TABLE).within(() => {
        cy.getBySel('dataGridColumnSelectorButton').click();
      });
      cy.get('[role="dialog"]')
        .find('[data-test-subj^="dataGridColumnSelectorColumnItem-"]')
        .should('have.length.greaterThan', 0);
      cy.get('body').type('{esc}');

      // Open document flyout
      cy.getBySel(RESULTS_TABLE).within(() => {
        cy.get('[data-test-subj="docTableExpandToggleColumn"]').first().click();
      });
      cy.getBySel(RESULTS_FLYOUT).should('exist');

      // Close document flyout
      cy.getBySel(RESULTS_FLYOUT).within(() => {
        cy.get('[data-test-subj="euiFlyoutCloseButton"]').click();
      });
      cy.getBySel(RESULTS_FLYOUT).should('not.exist');
      cy.getBySel(RESULTS_TABLE).should('exist');
    });
  }
);
