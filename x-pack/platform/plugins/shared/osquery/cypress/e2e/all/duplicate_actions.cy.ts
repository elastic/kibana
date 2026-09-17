/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServerlessRoleName } from '../../support/roles';
import { navigateTo } from '../../tasks/navigation';
import {
  loadSavedQuery,
  cleanupSavedQuery,
  loadPack,
  cleanupPack,
  getPack,
} from '../../tasks/api_fixtures';

// Only e2e coverage of the duplicate flows (row menu -> copy API -> copy's edit page).
// Agent-independent, so safe to run without enrolled agents.
describe('ALL - Duplicate actions', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    cy.login(ServerlessRoleName.SOC_MANAGER);
  });

  describe('saved queries', () => {
    let savedQuerySoId: string;
    let savedQueryName: string;
    let copySoId: string | undefined;

    beforeEach(() => {
      copySoId = undefined;
      loadSavedQuery().then((savedQuery) => {
        savedQuerySoId = savedQuery.saved_object_id;
        savedQueryName = savedQuery.id;
      });
    });

    afterEach(() => {
      cleanupSavedQuery(savedQuerySoId);
      if (copySoId) {
        cleanupSavedQuery(copySoId);
      }
    });

    it('duplicates a saved query from the list row menu', () => {
      cy.intercept('POST', '**/api/osquery/saved_queries/*/copy').as('copySavedQuery');
      navigateTo('/app/osquery/saved_queries');

      // Search first: a `<name>_copy` left by a previous retry would also match a bare contains.
      cy.getBySel('saved-queries-toolbar-search').type(`${savedQueryName}{enter}`);
      cy.get(`[aria-label="Actions for ${savedQueryName}"]`).click();
      cy.contains('Duplicate query').click();

      cy.wait('@copySavedQuery').then(({ response }) => {
        expect(response?.statusCode).to.equal(200);
        copySoId = response?.body.data.saved_object_id;
      });
      cy.contains('Saved query duplicated successfully');

      cy.url().should('include', '/app/osquery/saved_queries/');
      cy.get('input[name="id"]').should('have.value', `${savedQueryName}_copy`);
    });
  });

  describe('packs', () => {
    let packSoId: string;
    let packName: string;
    let copySoId: string | undefined;

    beforeEach(() => {
      copySoId = undefined;
      loadPack({
        queries: {
          duplicate_test: {
            interval: 3600,
            query: 'select * from uptime;',
            ecs_mapping: {},
          },
        },
      }).then((pack) => {
        packSoId = pack.saved_object_id;
        packName = pack.name ?? '';
      });
    });

    afterEach(() => {
      cleanupPack(packSoId);
      if (copySoId) {
        cleanupPack(copySoId);
      }
    });

    it('duplicates a pack from the list row menu and creates the copy disabled', () => {
      cy.intercept('POST', '**/api/osquery/packs/*/copy').as('copyPack');
      navigateTo('/app/osquery/packs');

      cy.getBySel('packs-toolbar-search').type(`${packName}{enter}`);
      cy.get(`[aria-label="Actions for ${packName}"]`).click();
      cy.contains('Duplicate pack').click();

      cy.wait('@copyPack').then(({ response }) => {
        expect(response?.statusCode).to.equal(200);
        copySoId = response?.body.data.saved_object_id;
      });
      cy.contains('Pack duplicated successfully');

      cy.url().should('match', /\/app\/osquery\/packs\/[^/]+\/edit/);
      cy.contains(`${packName}_copy`);

      // A copy created active would immediately deploy to the source pack's policies.
      cy.then(() => {
        if (!copySoId) {
          throw new Error('copy pack id was not captured from the copy response');
        }

        return getPack(copySoId).then((response) => {
          expect(response.body.data.enabled).to.equal(false);
        });
      });
    });
  });
});
