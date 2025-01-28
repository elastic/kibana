/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { navigateTo } from '../../tasks/navigation';
import {
  addToCase,
  checkActionItemsInResults,
  checkResults,
  selectAllAgents,
  submitQuery,
  viewRecentCaseAndCheckResults,
} from '../../tasks/live_query';
import { LIVE_QUERY_EDITOR } from '../../screens/live_query';
import { loadPack, cleanupPack, cleanupCase, loadCase } from '../../tasks/api_fixtures';
import { ServerlessRoleName } from '../../support/roles';

// FLAKY: https://github.com/elastic/kibana/issues/169888
describe.skip('ALL - Live Query Packs', { tags: ['@ess', '@serverless'] }, () => {
  let packName: string;
  let packId: string;
  let caseId: string;

  before(() => {
    loadPack({
      queries: {
        system_memory_linux_elastic: {
          ecs_mapping: {},
          interval: 3600,
          timeout: 700,
          platform: 'linux',
          query: 'SELECT * FROM memory_info;',
        },
        system_info_elastic: {
          ecs_mapping: {},
          interval: 3600,
          timeout: 200,
          platform: 'linux,windows,darwin',
          query: 'SELECT * FROM system_info;',
        },
        failingQuery: {
          ecs_mapping: {},
          interval: 10,
          timeout: 90,
          query: 'select opera_extensions.* from users join opera_extensions using (uid);',
        },
      },
    }).then((pack) => {
      packId = pack.saved_object_id;
      packName = pack.name;
    });

    loadCase('securitySolution').then((caseInfo) => {
      caseId = caseInfo.id;
    });
  });

  beforeEach(() => {
    cy.login(ServerlessRoleName.SOC_MANAGER);
    navigateTo('/app/osquery');
  });

  after(() => {
    cleanupPack(packId);
    cleanupCase(caseId);
  });

  it('should run live pack', () => {
    cy.contains('New live query').click();
    cy.contains('Run a set of queries in a pack.').click();
    cy.getBySel(LIVE_QUERY_EDITOR).should('not.exist');
    cy.getBySel('select-live-pack').click().type(`${packName}{downArrow}{enter}`);
    cy.contains('This table contains 3 rows.');
    cy.contains('system_memory_linux_elastic');
    cy.contains('system_info_elastic');
    cy.contains('failingQuery');
    selectAllAgents();
    submitQuery();
    cy.getBySel('toggleIcon-system_memory_linux_elastic').click();
    checkResults();
    checkActionItemsInResults({
      lens: true,
      discover: true,
      cases: true,
      timeline: false,
    });
    cy.contains('Status').click();
    cy.getBySel('tableHeaderCell_status_0').should('exist');
    cy.getBySel('tableHeaderCell_fields.agent_id[0]_1').should('exist');
    cy.getBySel('tableHeaderCell__source.action_response.osquery.count_2').should('exist');
    cy.getBySel('tableHeaderCell_fields.error[0]_3').should('exist');

    // TODO check why this is always PENDING
    cy.getBySel('toggleIcon-system_memory_linux_elastic').click();
    // cy.getBySel('toggleIcon-failingQuery').click();
    // cy.contains('Status').click();
    // cy.contains('query failed, code: 1, message: no such table: opera_extensions', {
    //   timeout: 120000,
    // });
    // cy.getBySel('toggleIcon-failingQuery').click();
    cy.getBySel('toggleIcon-system_memory_linux_elastic').click();
    addToCase(caseId);
    viewRecentCaseAndCheckResults();
  });
});
