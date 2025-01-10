/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { customActionEditSavedQuerySelector, UPDATE_QUERY_BUTTON } from '../../screens/packs';
import { navigateTo } from '../../tasks/navigation';
import { loadSavedQuery, cleanupSavedQuery } from '../../tasks/api_fixtures';
import { ServerlessRoleName } from '../../support/roles';

describe('ALL - Edit saved query', { tags: ['@ess', '@serverless'] }, () => {
  let savedQueryName: string;
  let savedQueryId: string;

  before(() => {
    loadSavedQuery().then((data) => {
      savedQueryId = data.saved_object_id;
      savedQueryName = data.id;
    });
  });

  beforeEach(() => {
    cy.login(ServerlessRoleName.SOC_MANAGER);
    navigateTo('/app/osquery/saved_queries');
  });

  after(() => {
    cleanupSavedQuery(savedQueryId);
  });

  it('by changing ecs mappings and platforms', () => {
    cy.get(customActionEditSavedQuerySelector(savedQueryName)).click();
    cy.contains('Custom key/value pairs.').should('exist');
    cy.contains('Hours of uptime').should('exist');
    cy.get('[data-test-subj="ECSMappingEditorForm"]')
      .first()
      .within(() => {
        cy.get(`[aria-label="Delete ECS mapping row"]`).click();
      });

    cy.getBySel('osquery-platform-checkbox-group').within(() => {
      cy.get('input[id="linux"]').should('be.checked');
      cy.get('input[id="darwin"]').should('be.checked');
      cy.get('input[id="windows"]').should('not.be.checked');
    });

    cy.get('#windows').check({ force: true });

    cy.getBySel(UPDATE_QUERY_BUTTON).click();

    cy.wait(5000);

    cy.get(customActionEditSavedQuerySelector(savedQueryName)).click();

    cy.contains('Custom key/value pairs').should('not.exist');
    cy.contains('Hours of uptime').should('not.exist');

    cy.getBySel('osquery-platform-checkbox-group').within(() => {
      cy.get('input[id="linux"]').should('be.checked');
      cy.get('input[id="darwin"]').should('be.checked');
      cy.get('input[id="windows"]').should('be.checked');
    });
  });
});
