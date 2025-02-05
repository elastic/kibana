/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { navigateTo } from '../../tasks/navigation';
import { checkResults, inputQuery, submitQuery } from '../../tasks/live_query';
import { loadSavedQuery, cleanupSavedQuery } from '../../tasks/api_fixtures';
import { triggerLoadData } from '../../tasks/inventory';
import { ServerlessRoleName } from '../../support/roles';

describe('ALL - Inventory', { tags: ['@ess'] }, () => {
  let savedQueryName: string;
  let savedQueryId: string;

  beforeEach(() => {
    loadSavedQuery().then((data) => {
      savedQueryId = data.saved_object_id;
      savedQueryName = data.id;
    });
  });

  afterEach(() => {
    cleanupSavedQuery(savedQueryId);
  });

  describe('', () => {
    beforeEach(() => {
      cy.login(ServerlessRoleName.SOC_MANAGER);
      navigateTo('/app/osquery');
    });

    it('should be able to run the query', () => {
      cy.getBySel('toggleNavButton').click();
      cy.contains('Infrastructure').click();

      triggerLoadData();
      cy.contains('Osquery').click();
      inputQuery('select * from uptime;');

      submitQuery();
      checkResults();
    });

    it('should be able to run the previously saved query', () => {
      cy.getBySel('toggleNavButton').click();
      cy.getBySel('collapsibleNavAppLink').contains('Infrastructure').click();

      triggerLoadData();
      cy.contains('Osquery').click();

      cy.getBySel('comboBoxInput').first().click();
      cy.wait(500);
      cy.getBySel('comboBoxInput').first().type(`${savedQueryName}{downArrow}{enter}`);

      submitQuery();
      checkResults();
    });
  });
});
