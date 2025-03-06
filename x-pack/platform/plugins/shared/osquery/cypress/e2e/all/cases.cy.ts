/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServerlessRoleName } from '../../support/roles';
import { initializeDataViews } from '../../tasks/login';
import {
  addLiveQueryToCase,
  checkActionItemsInResults,
  viewRecentCaseAndCheckResults,
} from '../../tasks/live_query';
import { navigateTo } from '../../tasks/navigation';
import { loadLiveQuery, loadCase, cleanupCase } from '../../tasks/api_fixtures';

describe('Add to Cases', () => {
  let liveQueryId: string;
  let liveQueryQuery: string;
  before(() => {
    initializeDataViews();
    loadLiveQuery({
      agent_all: true,
      query: "SELECT * FROM os_version where name='Ubuntu';",
      kuery: '',
    }).then((liveQuery) => {
      liveQueryId = liveQuery.action_id;
      liveQueryQuery = liveQuery.queries[0].query;
    });
  });

  describe('observability', { tags: ['@ess'] }, () => {
    let caseId: string;
    let caseTitle: string;
    beforeEach(() => {
      loadCase('observability').then((caseInfo) => {
        caseId = caseInfo.id;
        caseTitle = caseInfo.title;
      });
      cy.login(ServerlessRoleName.SOC_MANAGER, false);
      navigateTo('/app/osquery');
    });

    afterEach(() => {
      cleanupCase(caseId);
    });

    it('should add result a case and not have add to timeline in result', () => {
      addLiveQueryToCase(liveQueryId, caseId);
      cy.contains(`Case ${caseTitle} updated`);
      viewRecentCaseAndCheckResults();

      cy.contains(liveQueryQuery);
      checkActionItemsInResults({
        lens: true,
        discover: true,
        cases: false,
        timeline: false,
      });
    });
  });

  describe('security', { tags: ['@ess', '@serverless', '@skipInServerlessMKI'] }, () => {
    let caseId: string;
    let caseTitle: string;

    beforeEach(() => {
      loadCase('securitySolution').then((caseInfo) => {
        caseId = caseInfo.id;
        caseTitle = caseInfo.title;
      });
      cy.login(ServerlessRoleName.SOC_MANAGER, false);
      navigateTo('/app/osquery');
    });

    afterEach(() => {
      cleanupCase(caseId);
    });

    it('should add result a case and have add to timeline in result', () => {
      addLiveQueryToCase(liveQueryId, caseId);
      cy.contains(`Case ${caseTitle} updated`);
      viewRecentCaseAndCheckResults();

      cy.contains("SELECT * FROM os_version where name='Ubuntu';");
      checkActionItemsInResults({
        lens: true,
        discover: true,
        cases: false,
        timeline: true,
      });
    });
  });
});
