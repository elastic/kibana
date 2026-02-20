/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitForAlertsToPopulate } from '@kbn/cypress-test-helper/src/services/alerting_services';
import { disableNewFeaturesTours } from '../../tasks/navigation';
import { initializeDataViews } from '../../tasks/login';
import { checkResults, clickRuleName, goToAlertsTab, submitQuery } from '../../tasks/live_query';
import { loadRule, cleanupRule } from '../../tasks/api_fixtures';
import { ServerlessRoleName } from '../../support/roles';

describe('Alert Test', { tags: ['@ess'] }, () => {
  let ruleName: string;
  let ruleId: string;

  before(() => {
    initializeDataViews();
    loadRule().then((data) => {
      ruleName = data.name;
      ruleId = data.id;
    });
  });

  describe('t1_analyst role', () => {
    beforeEach(() => {
      cy.login(ServerlessRoleName.T1_ANALYST);

      cy.visit('/app/security/rules', {
        onBeforeLoad: (win) => disableNewFeaturesTours(win),
      });
      clickRuleName(ruleName);
      goToAlertsTab();
      waitForAlertsToPopulate();
      cy.getBySel('expand-event').first().click();
      cy.getBySel('securitySolutionFlyoutInvestigationGuideButton').click();
      cy.contains('Get processes').click();
    });

    after(() => {
      cleanupRule(ruleId);
    });

    it('should be able to run rule investigation guide query', () => {
      submitQuery();
      checkResults();
    });

    it('should not be able to run custom query', () => {
      cy.intercept('POST', '/api/osquery/live_queries', (req) => {
        req.body.query = 'select * from processes limit 10';
      });
      submitQuery();
      cy.contains('Forbidden');
    });
  });
});
