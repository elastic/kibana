/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SAVED_QUERY_DROPDOWN_SELECT } from '../../screens/packs';
import { navigateTo } from '../../tasks/navigation';
import {
  checkActionItemsInResults,
  checkResults,
  fillInQueryTimeout,
  inputQuery,
  selectAllAgents,
  submitQuery,
  typeInECSFieldInput,
  typeInOsqueryFieldInput,
  verifyQueryTimeout,
} from '../../tasks/live_query';
import { LIVE_QUERY_EDITOR, RESULTS_TABLE, RESULTS_TABLE_BUTTON } from '../../screens/live_query';
import { getAdvancedButton } from '../../screens/integrations';
import { loadSavedQuery, cleanupSavedQuery } from '../../tasks/api_fixtures';
import { ServerlessRoleName } from '../../support/roles';

describe(
  'ALL - Live Query run custom and saved',
  { tags: ['@ess', '@serverless', '@skipInServerlessMKI'] },
  () => {
    let savedQueryId: string;
    let savedQueryName: string;

    before(() => {
      loadSavedQuery({
        interval: '3600',
        query: 'select * from uptime;',
        ecs_mapping: {},
      }).then((savedQuery) => {
        savedQueryId = savedQuery.saved_object_id;
        savedQueryName = savedQuery.id;
      });
    });

    beforeEach(() => {
      cy.login(ServerlessRoleName.SOC_MANAGER);
      navigateTo('/app/osquery');
    });

    after(() => {
      cleanupSavedQuery(savedQueryId);
    });

    it('should run query and enable ecs mapping', () => {
      const cmd = Cypress.platform === 'darwin' ? '{meta}{enter}' : '{ctrl}{enter}';
      cy.contains('New live query').click();
      selectAllAgents();
      inputQuery('select * from uptime;');
      cy.wait(500);
      // checking submit by clicking cmd+enter
      inputQuery(cmd);
      checkResults();
      checkActionItemsInResults({
        lens: true,
        discover: true,
        cases: true,
        timeline: false,
      });
      cy.get(
        '[data-gridcell-column-index="1"][data-test-subj="dataGridHeaderCell-osquery.days.number"]'
      ).should('exist');
      cy.get(
        '[data-gridcell-column-index="2"][data-test-subj="dataGridHeaderCell-osquery.hours.number"]'
      ).should('exist');

      getAdvancedButton().click();
      typeInECSFieldInput('message{downArrow}{enter}');
      typeInOsqueryFieldInput('days{downArrow}{enter}');
      submitQuery();

      checkResults();
      cy.getBySel(RESULTS_TABLE).within(() => {
        cy.getBySel(RESULTS_TABLE_BUTTON).should('exist');
      });
      cy.get(
        '[data-gridcell-column-index="1"][data-test-subj="dataGridHeaderCell-message"]'
      ).should('exist');
      cy.get(
        '[data-gridcell-column-index="2"][data-test-subj="dataGridHeaderCell-osquery.days.number"]'
      )
        .should('exist')
        .within(() => {
          cy.get(`.euiToolTipAnchor`);
        });
    });

    it('should run customized saved query', () => {
      cy.contains('New live query').click();
      selectAllAgents();
      cy.getBySel(SAVED_QUERY_DROPDOWN_SELECT).type(`${savedQueryName}{downArrow}{enter}`);
      inputQuery('{selectall}{backspace}select * from users;');
      getAdvancedButton().click();
      fillInQueryTimeout('601');
      cy.wait(1000);
      submitQuery();
      checkResults();
      navigateTo('/app/osquery');
      cy.get('[aria-label="Run query"]').first().should('be.visible').click();

      cy.getBySel(LIVE_QUERY_EDITOR).contains('select * from users;');
      verifyQueryTimeout('601');
    });

    it('should open query details by clicking the details icon', () => {
      cy.get('[aria-label="Details"]').first().should('be.visible').click();
      cy.contains('Live query details');
      cy.contains('select * from users;');
    });
  }
);
