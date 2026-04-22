/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_VERSIONS } from '@kbn/osquery-plugin/common/constants';
import { navigateTo } from '../../tasks/navigation';
import {
  addToCaseFromRowKebab,
  checkResults,
  fillInQueryTimeout,
  inputQuery,
  selectAllAgents,
  submitQuery,
  typeInECSFieldInput,
  typeInOsqueryFieldInput,
  verifyQueryTimeout,
  viewRecentCaseAndCheckResults,
} from '../../tasks/live_query';
import { LIVE_QUERY_EDITOR, RESULTS_TABLE } from '../../screens/live_query';
import { SAVED_QUERY_DROPDOWN_SELECT } from '../../screens/packs';
import { getAdvancedButton } from '../../screens/integrations';
import { request } from '../../tasks/common';
import {
  cleanupCase,
  cleanupPack,
  cleanupSavedQuery,
  loadCase,
  loadLiveQuery,
  loadPack,
  loadSavedQuery,
} from '../../tasks/api_fixtures';
import { ServerlessRoleName } from '../../support/roles';

describe('ALL - Live Query Workflow', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    cy.login(ServerlessRoleName.SOC_MANAGER);
  });

  describe('form submission', () => {
    beforeEach(() => {
      navigateTo('/app/osquery/new');
    });

    it('submits a live query against all agents with a custom timeout', () => {
      submitQuery();
      cy.contains('Agents is a required field');
      cy.contains('Query is a required field');
      selectAllAgents();
      inputQuery('select * from uptime;');
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

    it('returns results for a live query via API (requires enrolled agents)', () => {
      loadLiveQuery().then((liveQuery) => {
        request({
          url: `/api/osquery/live_queries/${liveQuery.action_id}/results/${liveQuery.queries?.[0].action_id}`,
          headers: {
            'Elastic-Api-Version': API_VERSIONS.public.v1,
          },
        })
          .its('status')
          .should('eq', 200);
      });
    });
  });

  describe(
    'custom and saved queries',
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
        navigateTo('/app/osquery');
      });

      after(() => {
        cleanupSavedQuery(savedQueryId);
      });

      it('runs a query with ECS mapping enabled', () => {
        navigateTo('/app/osquery/new');
        selectAllAgents();
        inputQuery('select * from uptime;');
        getAdvancedButton().click();
        typeInECSFieldInput('message{downArrow}{enter}');
        typeInOsqueryFieldInput('days{downArrow}{enter}');
        submitQuery();

        checkResults();
        cy.getBySel(RESULTS_TABLE).within(() => {
          cy.get('[data-test-subj="dataGridHeaderCell-message"]').should('exist');
        });
      });

      it('runs a customized saved query and re-runs it from history', () => {
        navigateTo('/app/osquery/new');
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
      });

      it('opens query details from history', () => {
        cy.get('[aria-label="Details"]').first().should('be.visible').click();
        cy.contains('View history');
        cy.contains('select * from users;');
      });
    }
  );

  describe('live pack workflow', () => {
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
      navigateTo('/app/osquery');
    });

    after(() => {
      cleanupPack(packId);
      cleanupCase(caseId);
    });

    it('runs a live pack, surfaces per-query status, and adds results to a case', () => {
      cy.contains('Run query').click();
      cy.contains('Run a set of queries in a pack.').click();
      cy.getBySel(LIVE_QUERY_EDITOR).should('not.exist');
      cy.getBySel('select-live-pack').click().type(`${packName}{downArrow}{enter}`);
      cy.contains('system_memory_linux_elastic');
      cy.contains('system_info_elastic');
      cy.contains('failingQuery');
      selectAllAgents();
      submitQuery();
      cy.getBySel('toggleIcon-system_memory_linux_elastic').click();
      checkResults();
      cy.contains('Status').click();
      cy.getBySel('dataGridHeaderCell-status').should('exist');
      cy.getBySel('dataGridHeaderCell-agent_id').should('exist');
      cy.getBySel('dataGridHeaderCell-action_response.osquery.count').should('exist');
      cy.getBySel('dataGridHeaderCell-error').should('exist');

      cy.getBySel('toggleIcon-system_memory_linux_elastic').click();
      cy.getBySel('toggleIcon-failingQuery').click();
      cy.contains('Status').click();
      cy.contains('query failed, code: 1, message: no such table: opera_extensions', {
        timeout: 120000,
      });
      cy.getBySel('toggleIcon-failingQuery').click();
      cy.getBySel('toggleIcon-system_memory_linux_elastic').click();
      addToCaseFromRowKebab(caseId);
      viewRecentCaseAndCheckResults();
    });
  });
});
