/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_VERSIONS } from '@kbn/osquery-plugin/common/constants';
import { navigateTo } from '../../tasks/navigation';
import {
  checkResults,
  fillInQueryTimeout,
  inputQuery,
  selectAllAgents,
  submitQuery,
} from '../../tasks/live_query';
import { LIVE_QUERY_EDITOR } from '../../screens/live_query';
import { getAdvancedButton } from '../../screens/integrations';
import { request } from '../../tasks/common';
import { loadLiveQuery } from '../../tasks/api_fixtures';
import { ServerlessRoleName } from '../../support/roles';

describe('ALL - Live Query', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    cy.login(ServerlessRoleName.SOC_MANAGER);
    navigateTo('/app/osquery/new');
  });

  it('should validate the form', () => {
    submitQuery();
    cy.contains('Agents is a required field');
    cy.contains('Query is a required field');
    selectAllAgents();
    inputQuery('select * from uptime;');
    // Validate timeout before any successful submission (redirect would leave the form)
    getAdvancedButton().click();
    fillInQueryTimeout('86401');
    submitQuery();
    cy.contains('Agents is a required field').should('not.exist');
    cy.contains('Query is a required field').should('not.exist');
    cy.contains('The timeout value must be 86400 seconds or lower.');
    fillInQueryTimeout('120');

    cy.intercept('POST', '/api/osquery/live_queries').as('postQuery');
    submitQuery();
    cy.contains('The timeout value must be 86400 seconds or lower.').should('not.exist');
    cy.wait('@postQuery').then((interception) => {
      expect(interception.request.body).to.have.property('query', 'select * from uptime;');
      expect(interception.request.body).to.have.property('timeout', 120);
      expect(interception.response?.statusCode).to.eq(200);
      expect(interception.response?.body.data.queries[0]).to.have.property('timeout', 120);
    });
    checkResults();
  });

  it('should return results for a live query via API (requires enrolled agents)', () => {
    // Moved from cypress/e2e/api/live_query_results.cy.ts — requires agents to produce results
    loadLiveQuery().then((liveQuery) => {
      const liveQueryId = liveQuery.action_id;
      const queriesQueryActionId = liveQuery.queries?.[0].action_id;

      request({
        url: `/api/osquery/live_queries/${liveQueryId}/results/${queriesQueryActionId}`,
        headers: {
          'Elastic-Api-Version': API_VERSIONS.public.v1,
        },
      }).then((response) => {
        expect(response.status).to.eq(200);
      });
    });
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
    cy.getBySel(LIVE_QUERY_EDITOR).invoke('height').and('be.gt', 99).and('be.lt', 110);
    cy.getBySel(LIVE_QUERY_EDITOR).click().invoke('val', multilineQuery);

    inputQuery(multilineQuery);
    cy.getBySel(LIVE_QUERY_EDITOR).invoke('height').should('be.gt', 220).and('be.lt', 300);

    // check if it gets bigger when we add more lines
    inputQuery(multilineQuery);
    cy.getBySel(LIVE_QUERY_EDITOR).invoke('height').should('be.gt', 350).and('be.lt', 600);

    inputQuery('{selectall}{backspace}{selectall}{backspace}');
    // not sure if this is how it used to work when I implemented the functionality, but let's leave it like this for now
    cy.getBySel(LIVE_QUERY_EDITOR).invoke('height').should('be.gt', 200).and('be.lt', 400);

    // Submit and verify results (redirects to details page after success)
    inputQuery('{selectall}{backspace}');
    inputQuery(multilineQuery);
    selectAllAgents();
    submitQuery();
    cy.getBySel('osqueryResultsPanel');
  });
});
