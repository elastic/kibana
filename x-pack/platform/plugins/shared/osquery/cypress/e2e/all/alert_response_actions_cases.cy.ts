/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { initializeDataViews } from '../../tasks/login';
import {
  cleanupCase,
  cleanupPack,
  cleanupRule,
  loadPack,
  loadRule,
  packFixture,
} from '../../tasks/api_fixtures';
import { loadRuleAlerts, navigateToRule, submitQuery } from '../../tasks/live_query';
import { OSQUERY_FLYOUT_BODY_EDITOR } from '../../screens/live_query';
import { generateRandomStringName, interceptCaseId } from '../../tasks/integrations';

describe(
  'Alert Response Actions',
  { tags: ['@ess', '@serverless', '@skipInServerlessMKI'] },
  () => {
    describe('Alert → Case workflows', () => {
      let ruleId: string;
      let ruleName: string;
      let packId: string;
      let packName: string;
      const packData = packFixture();

      before(() => {
        initializeDataViews();
        loadPack(packData).then((data) => {
          packId = data.saved_object_id;
          packName = data.name;
        });
        loadRule(true).then((data) => {
          ruleId = data.id;
          ruleName = data.name;
          loadRuleAlerts(data.name);
        });
      });

      beforeEach(() => {
        navigateToRule(ruleName);
      });

      after(() => {
        cleanupPack(packId);
        cleanupRule(ruleId);
      });

      describe('Case creation', () => {
        let caseId: string;

        before(() => {
          interceptCaseId((id) => {
            caseId = id;
          });
        });

        after(() => {
          if (caseId) {
            cleanupCase(caseId);
          }
        });

        it('runs osquery against an alert and creates a new case', () => {
          const [caseName, caseDescription] = generateRandomStringName(2);
          cy.getBySel('expand-event').first().click();
          cy.getBySel('securitySolutionFlyoutFooterDropdownButton').click();
          cy.getBySel('osquery-action-item').click();
          cy.contains(/^\d+ agen(t|ts) selected/);
          cy.getBySel('globalLoadingIndicator').should('not.exist');
          // Wait until the flyout has fully rendered (default single-query editor
          // present) before switching to pack mode — avoids a `cy.wait(1000)`
          // band-aid that was masking the "radio clickable before it's interactable"
          // race from the original alerts_cases spec.
          cy.get(OSQUERY_FLYOUT_BODY_EDITOR).should('be.visible');
          cy.contains('Run a set of queries in a pack').click();
          cy.get(OSQUERY_FLYOUT_BODY_EDITOR).should('not.exist');
          cy.getBySel('globalLoadingIndicator').should('not.exist');
          cy.getBySel('select-live-pack').click().type(`${packName}{downArrow}{enter}`);
          submitQuery();
          cy.get('[aria-label="Add to Case"]').first().click();
          cy.getBySel('cases-table-add-case-filter-bar').click();
          cy.getBySel('create-case-flyout').should('be.visible');
          cy.get('input[aria-describedby="caseTitle"]').type(caseName);
          cy.get('textarea[aria-label="caseDescription"]').type(caseDescription);
          cy.getBySel('create-case-submit').click();
          cy.contains(`An alert was added to "${caseName}"`);
        });
      });
    });
  }
);
