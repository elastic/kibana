/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  activeStateSwitchComponentSelector,
  customActionEditSavedQuerySelector,
  customActionRunSavedQuerySelector,
  formFieldInputSelector,
} from '../../screens/packs';
import { navigateTo } from '../../tasks/navigation';
import {
  checkActionItemsInResults,
  checkResults,
  selectAllAgents,
  submitQuery,
} from '../../tasks/live_query';
import { LIVE_QUERY_EDITOR } from '../../screens/live_query';
import {
  cleanupPack,
  cleanupSavedQuery,
  loadLiveQuery,
  loadPack,
  loadSavedQuery,
} from '../../tasks/api_fixtures';
import type { ServerlessRoleName } from '../../support/roles';

describe('Reader - only READ', { tags: ['@ess'] }, () => {
  let savedQueryName: string;
  let savedQueryId: string;
  let packName: string;
  let packId: string;
  let liveQueryQuery: string;

  before(() => {
    loadPack().then((data) => {
      packId = data.saved_object_id;
      packName = data.name;
    });
    loadSavedQuery().then((data) => {
      savedQueryId = data.saved_object_id;
      savedQueryName = data.id;
    });
    loadLiveQuery().then((data) => {
      liveQueryQuery = data.queries?.[0].query;
    });
  });

  beforeEach(() => {
    cy.login('reader' as ServerlessRoleName);
  });

  after(() => {
    cleanupSavedQuery(savedQueryId);
    cleanupPack(packId);
  });

  it('should not be able to add, run, or edit saved queries, and should be denied live query access', () => {
    // Saved queries: read-only
    navigateTo('/app/osquery/saved_queries');
    cy.contains(savedQueryName);
    cy.contains('Add saved query').should('be.disabled');
    cy.get(customActionRunSavedQuerySelector(savedQueryName)).should('be.disabled');
    cy.get(customActionEditSavedQuerySelector(savedQueryName)).click();
    cy.get(formFieldInputSelector('id')).should('be.disabled');
    cy.get(formFieldInputSelector('description')).should('be.disabled');
    cy.contains('Update query').should('not.exist');
    cy.contains(`Delete query`).should('not.exist');

    // Live queries: permission denied
    navigateTo('/app/osquery/live_queries/new');
    cy.contains('Permission denied');

    // Live queries history: read-only
    navigateTo('/app/osquery/live_queries');
    cy.contains('New live query').should('be.disabled');
    cy.contains(liveQueryQuery);
    cy.get(customActionRunSavedQuerySelector(savedQueryName)).should('not.exist');
    cy.get(`[aria-label="Details"]`).should('exist');
  });

  it('should not be able to add nor edit packs', () => {
    navigateTo('/app/osquery/packs');
    cy.contains('Add pack').should('be.disabled');
    cy.getBySel('tablePaginationPopoverButton').click();
    cy.getBySel('tablePagination-50-rows').click();

    cy.get(activeStateSwitchComponentSelector(packName)).should('be.disabled');

    cy.contains(packName).click();
    cy.contains(`${packName} details`);
    cy.contains('Edit').should('be.disabled');
    cy.get(customActionRunSavedQuerySelector(savedQueryName)).should('not.exist');
    cy.get(customActionEditSavedQuerySelector(savedQueryName)).should('not.exist');
  });
});

describe(`T1 and T2 analysts`, { tags: ['@ess', '@serverless', '@skipInServerlessMKI'] }, () => {
  ['t1_analyst', 't2_analyst'].forEach((role: string) => {
    describe(`${role}- READ + runSavedQueries `, () => {
      let savedQueryName: string;
      let savedQueryId: string;
      let packName: string;
      let packId: string;
      let liveQueryQuery: string;

      before(() => {
        loadPack().then((data) => {
          packId = data.saved_object_id;
          packName = data.name;
        });
        loadSavedQuery().then((data) => {
          savedQueryId = data.saved_object_id;
          savedQueryName = data.id;
        });
        loadLiveQuery().then((data) => {
          liveQueryQuery = data.queries?.[0].query;
        });
      });

      beforeEach(() => {
        cy.login(role as ServerlessRoleName);
      });

      after(() => {
        cleanupSavedQuery(savedQueryId);
        cleanupPack(packId);
      });

      it('should be able to run saved queries, use them in new queries, and play history', () => {
        // Run saved query from saved queries page
        navigateTo('/app/osquery/saved_queries');
        cy.contains(savedQueryName);
        cy.contains('Add saved query').should('be.disabled');
        cy.get(`[aria-label="Run ${savedQueryName}"]`).should('not.be.disabled');
        cy.get(`[aria-label="Run ${savedQueryName}"]`).click();
        selectAllAgents();
        cy.contains('select * from uptime;');
        submitQuery();
        checkResults();
        checkActionItemsInResults({
          lens: true,
          discover: true,
          cases: true,
          timeline: false,
        });

        // Play from live queries history
        navigateTo('/app/osquery/live_queries');
        cy.contains('New live query').should('not.be.disabled');
        cy.contains(liveQueryQuery);
        cy.get(`[aria-label="Run query"]`).first().should('not.be.disabled');
        cy.get(`[aria-label="Run query"]`).first().click();
        cy.get('[data-test-subj="savedQuerySelect"]')
          .find('input')
          .should('have.value', savedQueryName);
        submitQuery();
        checkResults();

        // Use saved query in a new query
        navigateTo('/app/osquery/live_queries');
        cy.contains('New live query').should('not.be.disabled').click();
        selectAllAgents();
        cy.getBySel('savedQuerySelect').type(`${savedQueryName}{downArrow} {enter}`);
        cy.contains('select * from uptime');
        submitQuery();
        checkResults();
      });

      it('should not be able to add/edit packs or create custom live queries', () => {
        // Packs: read-only
        navigateTo('/app/osquery/packs');
        cy.getBySel('tablePaginationPopoverButton').click();
        cy.getBySel('tablePagination-50-rows').click();
        cy.contains('Add pack').should('be.disabled');
        cy.get(`[aria-label="${packName}"]`).should('be.disabled');
        cy.contains(packName).click();
        cy.contains(`${packName} details`);
        cy.contains('Edit').should('be.disabled');
        cy.get(`[aria-label="Run ${savedQueryId}"]`).should('not.exist');
        cy.get(`[aria-label="Edit ${savedQueryId}"]`).should('not.exist');

        // Can't create live query from scratch (no editor)
        navigateTo('/app/osquery');
        cy.contains('New live query').click();
        selectAllAgents();
        cy.getBySel(LIVE_QUERY_EDITOR).should('not.exist');
        submitQuery();
        cy.contains('Query is a required field');
      });
    });
  });
});
