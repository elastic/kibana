/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { navigateTo } from '../../tasks/navigation';
import { loadSavedQuery, cleanupSavedQuery } from '../../tasks/api_fixtures';
import {
  SAVED_QUERIES_TABLE,
  SAVED_QUERIES_SEARCH,
  SAVED_QUERIES_CREATED_BY,
  SAVED_QUERIES_COLUMNS,
  SAVED_QUERIES_SORT,
  rowActionsMenuSelector,
} from '../../screens/experimental';
import { ServerlessRoleName } from '../../support/roles';

describe(
  'EXPERIMENTAL - Saved Queries List (queryHistoryRework)',
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
    let savedQueryId: string;
    let savedQueryName: string;

    before(() => {
      cy.login(ServerlessRoleName.SOC_MANAGER);
      const uniqueSuffix = Date.now().toString(36);
      const testQueryId = `test-query-${uniqueSuffix}`;
      loadSavedQuery({
        id: testQueryId,
        description: 'A unique description for filter testing',
        query: 'select * from uptime;',
        interval: '3600',
      }).then((savedQuery) => {
        savedQueryId = savedQuery.saved_object_id;
        savedQueryName = savedQuery.id;
      });
    });

    after(() => {
      if (savedQueryId) {
        cleanupSavedQuery(savedQueryId);
      }
    });

    it('should render the saved queries table with toolbar and pagination', () => {
      cy.login(ServerlessRoleName.SOC_MANAGER);
      navigateTo('/app/osquery/saved_queries');
      cy.getBySel(SAVED_QUERIES_TABLE, { timeout: 60000 }).should('exist');

      // Table has rows
      cy.getBySel(SAVED_QUERIES_TABLE).find('tbody tr').should('have.length.above', 0);

      // Expected columns are present
      cy.getBySel(SAVED_QUERIES_TABLE).within(() => {
        cy.contains('Query ID').should('exist');
        cy.contains('Description').should('exist');
        cy.contains('Created by').should('exist');
        cy.contains('Last updated at').should('exist');
      });

      // Toolbar controls exist
      cy.getBySel(SAVED_QUERIES_SEARCH).should('exist');
      cy.getBySel(SAVED_QUERIES_CREATED_BY).should('exist');
      cy.getBySel(SAVED_QUERIES_COLUMNS).should('exist');
      cy.getBySel(SAVED_QUERIES_SORT).should('exist');

      // Pagination
      cy.get('[data-test-subj="tablePaginationPopoverButton"]').should('exist');

      // Each row has a run button and kebab actions
      cy.getBySel(SAVED_QUERIES_TABLE).within(() => {
        cy.get('tbody tr')
          .first()
          .within(() => {
            cy.get('td').first().find('button').should('exist'); // run button
            cy.get('td').last().find('button').should('exist'); // kebab
          });
      });
    });

    it('should filter saved queries via search and Created by', () => {
      cy.login(ServerlessRoleName.SOC_MANAGER);
      navigateTo('/app/osquery/saved_queries');
      cy.getBySel(SAVED_QUERIES_TABLE, { timeout: 60000 }).should('exist');

      // Search by query ID — unique suffix ensures exact match
      cy.intercept('GET', '/api/osquery/saved_queries*').as('searchResults');
      cy.getBySel(SAVED_QUERIES_SEARCH).type(`${savedQueryName}{enter}`);
      cy.wait('@searchResults');
      cy.getBySel(SAVED_QUERIES_TABLE).find('tbody tr').should('have.length', 1);
      cy.getBySel(SAVED_QUERIES_TABLE).find('tbody tr').first().should('contain', savedQueryName);

      // Search by description — verifies description field is searched
      cy.intercept('GET', '/api/osquery/saved_queries*').as('descriptionSearch');
      cy.getBySel(SAVED_QUERIES_SEARCH).clear().type('unique description for filter{enter}');
      cy.wait('@descriptionSearch');
      cy.getBySel(SAVED_QUERIES_TABLE).find('tbody tr').should('have.length.above', 0);
      cy.getBySel(SAVED_QUERIES_TABLE).should('contain', savedQueryName);

      // Non-matching search shows empty state
      cy.intercept('GET', '/api/osquery/saved_queries*').as('noResults');
      cy.getBySel(SAVED_QUERIES_SEARCH).clear().type('zzz_nonexistent_query_zzz{enter}');
      cy.wait('@noResults');
      cy.getBySel(SAVED_QUERIES_TABLE).contains('No items found').should('exist');

      // Clearing search restores all results
      cy.intercept('GET', '/api/osquery/saved_queries*').as('allResults');
      cy.getBySel(SAVED_QUERIES_SEARCH).clear().type('{enter}');
      cy.wait('@allResults');
      cy.getBySel(SAVED_QUERIES_TABLE).find('tbody tr').should('have.length.above', 1);

      // Created by filter
      cy.getBySel(SAVED_QUERIES_CREATED_BY).click();
      cy.get('[role="dialog"]').should('exist');
      cy.get('[role="dialog"]').find('[role="listbox"]').should('exist');
      cy.get('[role="dialog"]').find('[role="option"]').first().click();
      cy.get('body').type('{esc}');
      cy.getBySel(SAVED_QUERIES_TABLE).find('tbody tr').should('have.length.above', 0);
    });

    it('should support kebab actions, edit navigation, and run button', () => {
      cy.login(ServerlessRoleName.SOC_MANAGER);
      navigateTo('/app/osquery/saved_queries');
      cy.getBySel(SAVED_QUERIES_TABLE, { timeout: 60000 }).should('exist');

      // Search for the test query
      cy.intercept('GET', '/api/osquery/saved_queries*').as('findQuery');
      cy.getBySel(SAVED_QUERIES_SEARCH).type(`${savedQueryName}{enter}`);
      cy.wait('@findQuery');
      cy.getBySel(SAVED_QUERIES_TABLE).find('tbody tr').should('have.length', 1);

      // Kebab menu shows Edit and Duplicate
      cy.get(rowActionsMenuSelector(savedQueryName)).click();
      cy.get('[role="dialog"]').within(() => {
        cy.contains('Edit query').should('exist');
        cy.contains('Duplicate query').should('exist');
      });

      // Click Edit — navigates to edit page with correct query loaded
      cy.contains('Edit query').click();
      cy.url().should('include', '/saved_queries/');
      cy.get('input[name="id"]').should('have.value', savedQueryName);

      // Go back and test the Run button
      navigateTo('/app/osquery/saved_queries');
      cy.getBySel(SAVED_QUERIES_TABLE, { timeout: 60000 }).should('exist');
      cy.intercept('GET', '/api/osquery/saved_queries*').as('findQueryAgain');
      cy.getBySel(SAVED_QUERIES_SEARCH).type(`${savedQueryName}{enter}`);
      cy.wait('@findQueryAgain');
      cy.getBySel(SAVED_QUERIES_TABLE).find('tbody tr').should('have.length', 1);

      // Click Run — navigates to /new with the query pre-filled
      cy.getBySel(SAVED_QUERIES_TABLE).within(() => {
        cy.get(`button[aria-label="Run ${savedQueryName}"]`).click();
      });
      cy.url().should('include', '/app/osquery/new');
      // Verify the query was pre-populated
      cy.contains('select * from uptime;').should('exist');
    });
  }
);
