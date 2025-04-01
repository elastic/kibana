/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { navigateTo } from '../../tasks/navigation';
import {
  checkResults,
  fillInQueryTimeout,
  inputQuery,
  selectAllAgents,
  submitQuery,
  typeInECSFieldInput,
  typeInOsqueryFieldInput,
} from '../../tasks/live_query';
import { LIVE_QUERY_EDITOR } from '../../screens/live_query';
import { getAdvancedButton } from '../../screens/integrations';
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
    fillInQueryTimeout('86410');
    submitQuery();
    cy.contains('The timeout value must be 86400 seconds or or lower.');
    fillInQueryTimeout('890');
    submitQuery();
    cy.contains('The timeout value must be 86400 seconds or or lower.').should('not.exist');
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
});
