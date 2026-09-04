/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServerlessRoleName } from '../../support/roles';
import { navigateTo } from '../../tasks/navigation';
import { loadLiveQuery } from '../../tasks/api_fixtures';

// History list coverage: root redirect, toolbar search, Run-by filter,
// and legacy /live_queries deep-link redirects (pre-9.4 bookmarks).
describe('ALL - History list and filters', { tags: ['@ess', '@serverless'] }, () => {
  let uptimeActionId: string;

  before(() => {
    cy.login(ServerlessRoleName.SOC_MANAGER);
    loadLiveQuery({
      agent_all: true,
      query: 'select * from uptime;',
      kuery: '',
    }).then((liveQuery) => {
      uptimeActionId = liveQuery.action_id;
    });
    loadLiveQuery({
      agent_all: true,
      query: 'select * from users;',
      kuery: '',
    });
  });

  beforeEach(() => {
    cy.login(ServerlessRoleName.SOC_MANAGER);
  });

  it('redirects the app root to the history list', () => {
    navigateTo('/app/osquery');

    cy.url().should('include', '/app/osquery/history');
    cy.getBySel('unifiedHistoryTable').should('exist');
    cy.contains('select * from uptime;');
    cy.contains('select * from users;');
  });

  it('filters history rows via the toolbar search', () => {
    navigateTo('/app/osquery/history');
    cy.contains('select * from users;');

    cy.getBySel('history-toolbar-search').type('uptime{enter}');

    cy.contains('select * from uptime;');
    cy.contains('select * from users;').should('not.exist');
  });

  it('filters history rows by the Run by user', () => {
    navigateTo('/app/osquery/history');
    cy.contains('select * from uptime;');

    cy.getBySel('history-run-by-filter-button').click();
    // Options derive from actual action docs, so the first entry always matches fixture rows.
    cy.getBySel('history-run-by-filter-popover').find('.euiSelectableListItem').first().click();

    cy.getBySel('unifiedHistoryTable').should('exist');
    cy.contains('select * from uptime;');
  });

  it('redirects legacy /live_queries deep links onto /history, preserving the query string', () => {
    cy.visit('/app/osquery/live_queries');
    cy.url().should('include', '/app/osquery/history');

    cy.visit(`/app/osquery/live_queries/${uptimeActionId}?test=preserved`);
    cy.url().should('include', `/app/osquery/history/${uptimeActionId}`);
    cy.url().should('include', 'test=preserved');
    cy.contains('select * from uptime;');
  });
});
