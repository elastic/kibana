/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { initializeDataViews } from '../../tasks/login';
import { cleanupRule, loadRule } from '../../tasks/api_fixtures';
import {
  checkResults,
  inputQueryInFlyout,
  loadRuleAlerts,
  navigateToRule,
  submitQuery,
} from '../../tasks/live_query';
import { RESPONSE_ACTIONS_ITEM_0, RESPONSE_ACTIONS_ITEM_1 } from '../../tasks/response_actions';
import { closeModalIfVisible, closeToastIfVisible } from '../../tasks/integrations';

describe(
  'Alert Response Actions',
  { tags: ['@ess', '@serverless', '@skipInServerlessMKI'] },
  () => {
    describe('Take action flyout — investigation guide + linked apps', () => {
      let ruleId: string;
      let ruleName: string;

      before(() => {
        initializeDataViews();
        loadRule().then((data) => {
          ruleId = data.id;
          ruleName = data.name;
          loadRuleAlerts(data.name);
        });
      });

      beforeEach(() => {
        navigateToRule(ruleName);
      });

      after(() => {
        cleanupRule(ruleId);
      });

      it('adds investigation guide queries to response actions from rule editor', () => {
        cy.getBySel('editRuleSettingsLink').click();
        cy.getBySel('globalLoadingIndicator').should('not.exist');
        cy.getBySel('edit-rule-actions-tab').click();
        cy.getBySel('osquery-investigation-guide-text').should('exist');
        cy.getBySel('globalLoadingIndicator').should('not.exist');
        cy.contains('Loading connectors...').should('not.exist');

        cy.getBySel('osqueryAddInvestigationGuideQueries').click();
        cy.getBySel('osquery-investigation-guide-text').should('not.exist');

        cy.getBySel(RESPONSE_ACTIONS_ITEM_0).within(() => {
          cy.contains("SELECT * FROM os_version where name='{{host.os.name}}';");
          cy.get('input[value="host.os.platform"]').should('exist');
          cy.contains('platform');
        });
        cy.getBySel(RESPONSE_ACTIONS_ITEM_1).within(() => {
          cy.contains('select * from users');
        });

        cy.contains('Save changes').click();
        cy.contains(`${ruleName} was saved`).should('exist');
        closeToastIfVisible();
      });

      it(
        'runs a live query from the alert flyout and adds the action to Timeline',
        { tags: ['@skipInServerless'] },
        () => {
          const TIMELINE_NAME = 'Untitled Timeline';
          cy.getBySel('expand-event').first().click();
          cy.getBySel('securitySolutionFlyoutFooterDropdownButton').click();
          cy.getBySel('osquery-action-item').click();
          // Use only the alert's pre-selected host agent. Adding "All agents" pulls in
          // other enrolled-but-offline agents in CI, which makes the response action
          // wait indefinitely ("Some selected agents are offline or have unhealthy
          // Osquery components and may not respond to queries").
          cy.contains(/^1 agent selected/);
          inputQueryInFlyout('select * from uptime;');
          submitQuery();
          checkResults();
          cy.contains('Add to Timeline investigation');
          cy.getBySel('add-to-timeline').first().click();
          cy.getBySel('globalToastList').contains('Added');
          closeToastIfVisible();
          cy.contains('Cancel').click();
          cy.getBySel('timeline-bottom-bar').within(() => {
            cy.contains(TIMELINE_NAME).click();
          });
          cy.getBySel('draggableWrapperKeyboardHandler').contains('action_id: "');
          cy.visit('/app/osquery');
          closeModalIfVisible();
        }
      );
    });
  }
);
