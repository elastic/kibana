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

describe('ALL - Live Query', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    cy.login(ServerlessRoleName.SOC_MANAGER);
    navigateTo('/app/osquery');
  });

  it('should validate the form', () => {
    cy.contains('New live query').click();
    submitQuery();
    cy.contains('Agents is a required field');
    cy.contains('Query is a required field');
    selectAllAgents();
    inputQuery('select * from uptime;');
    submitQuery();
    cy.contains('Agents is a required field').should('not.exist');
    cy.contains('Query is a required field').should('not.exist');
    checkResults();
    getAdvancedButton().click();
    fillInQueryTimeout('901');
    submitQuery();
    cy.contains('The timeout value must be 900 seconds or lower.');
    fillInQueryTimeout('890');
    submitQuery();
    cy.contains('The timeout value must be 900 seconds or lower.').should('not.exist');
    typeInOsqueryFieldInput('days{downArrow}{enter}');
    submitQuery();
    cy.contains('ECS field is required.');
    typeInECSFieldInput('message{downArrow}{enter}');

    cy.intercept('POST', '/api/osquery/live_queries').as('postQuery');
    submitQuery();
    cy.contains('ECS field is required.').should('not.exist');
    cy.wait('@postQuery').then((interception) => {
      expect(interception.request.body).to.have.property('query', 'select * from uptime;');
      expect(interception.request.body).to.have.property('timeout', 890);
      expect(interception.response?.statusCode).to.eq(200);
      expect(interception.response?.body.data.queries[0]).to.have.property('timeout', 890);
    });
    checkResults();
    const firstCell = '[data-gridcell-column-index="0"][data-gridcell-row-index="0"]';
    cy.get(firstCell).should('exist');
    cy.get(firstCell).find('[data-euigrid-tab-managed="true"]').click();
    cy.url().should('include', 'app/fleet/agents/');
  });

  it('should run multiline query', () => {
    const multilineQuery =
      'select u.username, {shift+enter}' +
      '       p.pid, {shift+enter}' +
      '       p.name, {shift+enter}' +
      '       pos.local_address, {shift+enter}' +
      '       pos.local_port, {shift+enter}' +
      '       p.path, {shift+enter}' +
      '       p.cmdline, {shift+enter}' +
      '       pos.remote_address, {shift+enter}' +
      '       pos.remote_port {shift+enter}' +
      'from processes as p{esc}{shift+enter}' +
      'join users as u{esc}{shift+enter}' +
      '    on u.uid=p.uid{esc}{shift+enter}' +
      'join process_open_sockets as pos{esc}{shift+enter}' +
      '    on pos.pid=p.pid{esc}{shift+enter}' +
      "where pos.remote_port !='0' {shift+enter}" +
      'limit 1000;';
    cy.contains('New live query').click();
    cy.getBySel(LIVE_QUERY_EDITOR).invoke('height').and('be.gt', 99).and('be.lt', 110);
    cy.getBySel(LIVE_QUERY_EDITOR).click().invoke('val', multilineQuery);

    inputQuery(multilineQuery);
    cy.getBySel(LIVE_QUERY_EDITOR).invoke('height').should('be.gt', 220).and('be.lt', 300);
    selectAllAgents();
    submitQuery();
    cy.getBySel('osqueryResultsPanel');

    // check if it get's bigger when we add more lines
    cy.getBySel(LIVE_QUERY_EDITOR).invoke('height').should('be.gt', 220).and('be.lt', 300);
    inputQuery(multilineQuery);
    cy.getBySel(LIVE_QUERY_EDITOR).invoke('height').should('be.gt', 350).and('be.lt', 600);

    inputQuery('{selectall}{backspace}{selectall}{backspace}');
    // not sure if this is how it used to work when I implemented the functionality, but let's leave it like this for now
    cy.getBySel(LIVE_QUERY_EDITOR).invoke('height').should('be.gt', 200).and('be.lt', 400);
  });

  describe(
    'run custom and saved queries',
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

      after(() => {
        cleanupSavedQuery(savedQueryId);
      });

      it('should run query with ecs mapping, run customized saved query, and view details', () => {
        // Part 1: Run query and enable ECS mapping
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

        // Part 2: Run customized saved query
        cy.contains('New live query').click();
        selectAllAgents();
        cy.getBySel(SAVED_QUERY_DROPDOWN_SELECT).type(`${savedQueryName}{downArrow}{enter}`);
        inputQuery('{selectall}{backspace}select * from users;');
        getAdvancedButton().click();
        fillInQueryTimeout('601');
        submitQuery();
        checkResults();
        navigateTo('/app/osquery');
        cy.get('[aria-label="Run query"]').first().should('be.visible').click();

        cy.getBySel(LIVE_QUERY_EDITOR).contains('select * from users;');
        verifyQueryTimeout('601');

        // Part 3: Open query details
        navigateTo('/app/osquery');
        cy.get('[aria-label="Details"]').first().should('be.visible').click();
        cy.contains('Live query details');
        cy.contains('select * from users;');
      });
    }
  );
});
