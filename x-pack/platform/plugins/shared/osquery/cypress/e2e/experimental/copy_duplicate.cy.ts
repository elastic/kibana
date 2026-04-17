/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { navigateTo } from '../../tasks/navigation';
import { loadSavedQuery, cleanupSavedQuery, loadPack, cleanupPack } from '../../tasks/api_fixtures';
import { rowActionsMenuSelector } from '../../screens/experimental';
import { ServerlessRoleName } from '../../support/roles';

describe(
  'EXPERIMENTAL - Copy/Duplicate (queryHistoryRework)',
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
    let duplicatedSavedQueryId: string;
    let packId: string;
    let packName: string;
    let duplicatedPackId: string;

    before(() => {
      cy.login(ServerlessRoleName.SOC_MANAGER);
      loadSavedQuery().then((savedQuery) => {
        savedQueryId = savedQuery.saved_object_id;
        savedQueryName = savedQuery.id;
      });
      loadPack().then((pack) => {
        packId = pack.saved_object_id;
        packName = pack.name;
      });
    });

    after(() => {
      cleanupSavedQuery(savedQueryId);
      cleanupPack(packId);
      // Clean up the duplicated items
      if (duplicatedSavedQueryId) {
        cleanupSavedQuery(duplicatedSavedQueryId);
      }

      if (duplicatedPackId) {
        cleanupPack(duplicatedPackId);
      }
    });

    beforeEach(() => {
      cy.login(ServerlessRoleName.SOC_MANAGER);
    });

    it('should duplicate a saved query via kebab menu on the Queries page', () => {
      navigateTo('/app/osquery/saved_queries');
      cy.contains(savedQueryName).should('exist');

      // Open the kebab menu for this saved query
      cy.get(rowActionsMenuSelector(savedQueryName)).click();
      cy.contains('Duplicate query').click();

      // Verify success toast
      cy.getBySel('globalToastList')
        .contains('Saved query duplicated successfully')
        .should('exist');

      // After duplication, we are navigated to the edit page of the copy
      // Verify the ID field contains the original name with _copy suffix
      cy.get('input[name="id"]').should('have.value', `${savedQueryName}_copy`);

      // Capture the duplicated saved query ID from the URL for cleanup
      cy.url().then((url) => {
        const match = url.match(/saved_queries\/([^/]+)/);
        if (match) {
          duplicatedSavedQueryId = match[1];
        }
      });

      // Verify the query content was copied
      cy.getBySel('kibanaCodeEditor').should('exist');

      // Navigate back to list and verify the copy appears
      navigateTo('/app/osquery/saved_queries');
      cy.contains(`${savedQueryName}_copy`).should('exist');
    });

    it('should duplicate a pack via kebab menu on the Packs page', () => {
      navigateTo('/app/osquery/packs');
      cy.contains(packName).should('exist');

      // Open the kebab menu for this pack
      cy.get(rowActionsMenuSelector(packName)).click();
      cy.contains('Duplicate pack').click();

      // Verify success toast
      cy.getBySel('globalToastList').contains('Pack duplicated successfully').should('exist');

      // After duplication, we are navigated to the edit page of the copy
      // Verify the name field contains the original name with _copy suffix
      cy.get('input[name="name"]').should('have.value', `${packName}_copy`);

      // Capture the duplicated pack ID from the URL for cleanup
      cy.url().then((url) => {
        const match = url.match(/packs\/([^/]+)/);
        if (match) {
          duplicatedPackId = match[1];
        }
      });

      cy.url().should('include', '/packs/');
      cy.url().should('include', '/edit');

      // Navigate back to list and verify the copy appears
      navigateTo('/app/osquery/packs');
      cy.contains(`${packName}_copy`).should('exist');
    });
  }
);
