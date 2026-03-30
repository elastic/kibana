/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { initializeDataViews } from '../../tasks/login';
import { cleanupRule, loadRule } from '../../tasks/api_fixtures';
import {
  checkActionItemsInResults,
  inputQuery,
  loadRuleAlerts,
  navigateToRule,
  submitQuery,
  takeOsqueryActionWithParams,
} from '../../tasks/live_query';
import { OSQUERY_FLYOUT_BODY_EDITOR } from '../../screens/live_query';

const UUID_REGEX = '[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}';

describe(
  'Alert Response Actions',
  { tags: ['@ess', '@serverless', '@skipInServerlessMKI'] },
  () => {
    let ruleId: string;
    let ruleName: string;

    before(() => {
      initializeDataViews();
      loadRule(true).then((data) => {
        ruleId = data.id;
        ruleName = data.name;
        loadRuleAlerts(ruleName);
      });
    });

    after(() => {
      cleanupRule(ruleId);
    });

    it('can visit discover from response action results', { tags: ['@ess'] }, () => {
      navigateToRule(ruleName);
      const discoverRegex = new RegExp(`action_id: ${UUID_REGEX}`);
      cy.getBySel('expand-event').first().click();
      cy.getBySel('securitySolutionFlyoutResponseSectionHeader').click();
      cy.getBySel('securitySolutionFlyoutResponseButton').click();
      cy.getBySel('responseActionsViewWrapper').should('exist');
      checkActionItemsInResults({
        lens: true,
        discover: true,
        cases: true,
        timeline: true,
      });
      cy.contains('View in Discover')
        .should('exist')
        .should('have.attr', 'href')
        .then(($href) => {
          // @ts-expect-error-next-line href string - check types
          cy.visit($href);
          cy.getBySel('discoverDocTable', { timeout: 60000 }).within(() => {
            cy.contains(/action_data\.query\s*.+;/);
          });
          cy.contains(discoverRegex);
        });
    });

    it('can visit lens from response action results', { tags: ['@ess'] }, () => {
      navigateToRule(ruleName);
      const lensRegex = new RegExp(`Action ${UUID_REGEX} results`);
      cy.getBySel('expand-event').first().click();
      cy.getBySel('securitySolutionFlyoutResponseSectionHeader').click();
      cy.getBySel('securitySolutionFlyoutResponseButton').click();
      cy.getBySel('responseActionsViewWrapper').should('exist');
      cy.getBySel('osquery-results-comment')
        .first()
        .within(() => {
          let lensUrl = '';
          cy.window().then((win) => {
            cy.stub(win, 'open')
              .as('windowOpen')
              .callsFake((url) => {
                lensUrl = url;
              });
          });
          cy.get(`[aria-label="View in Lens"]`).click();
          cy.window()
            .its('open')
            .then(() => {
              cy.visit(lensUrl);
            });
        });
      cy.getBySel('lnsWorkspace').should('exist');
      cy.getBySel('breadcrumbs').contains(lensRegex);
    });

    it(
      'can add to timeline from response action results',
      { tags: ['@ess', '@serverless'] },
      () => {
        navigateToRule(ruleName);
        const timelineRegex = new RegExp(`Added ${UUID_REGEX} to Timeline`);
        const filterRegex = new RegExp(`action_id: "${UUID_REGEX}"`);
        cy.getBySel('expand-event').first().click();
        cy.getBySel('securitySolutionFlyoutResponseSectionHeader').click();
        cy.getBySel('securitySolutionFlyoutResponseButton').click();
        cy.getBySel('responseActionsViewWrapper').should('exist');
        checkActionItemsInResults({
          lens: true,
          discover: true,
          cases: true,
          timeline: true,
        });
        cy.getBySel('osquery-results-comment')
          .first()
          .within(() => {
            cy.get('.euiTableRow')
              .first()
              .within(() => {
                cy.getBySel('add-to-timeline').click();
              });
          });
        cy.contains(timelineRegex);
        cy.getBySel('securitySolutionFlyoutNavigationCollapseDetailButton').click();
        cy.getBySel('timeline-bottom-bar').contains('Untitled timeline').click();
        cy.contains(filterRegex);
      }
    );

    it('should substitute parameters in investigation guide', () => {
      loadRuleAlerts(ruleName);
      navigateToRule(ruleName);
      cy.getBySel('expand-event').first().click();
      cy.getBySel('securitySolutionFlyoutInvestigationGuideButton').click();
      cy.contains('Get processes').should('be.visible').dblclick({ force: true });
      cy.get(OSQUERY_FLYOUT_BODY_EDITOR).click();
      cy.getBySel('flyout-body-osquery').contains(/SELECT \* FROM os_version where name='.*';/);
      cy.getBySel('flyout-body-osquery').find('input[value="host.os.platform"]').should('exist');
      cy.getBySel('flyout-body-osquery').contains('platform');
    });

    it('should be able to run take action query against all enrolled agents', () => {
      loadRuleAlerts(ruleName);
      navigateToRule(ruleName);
      cy.getBySel('expand-event').first().click();
      cy.getBySel('securitySolutionFlyoutFooterDropdownButton').click({ force: true });
      cy.getBySel('osquery-action-item').click();
      cy.getBySel('agentSelection').within(() => {
        cy.getBySel('comboBoxClearButton').click();
        cy.getBySel('comboBoxInput').type('All{downArrow}{enter}{esc}');
        cy.contains('All agents');
      });
      inputQuery("SELECT * FROM os_version where name='{{host.os.name}}';", {
        parseSpecialCharSequences: false,
      });
      submitQuery();
      cy.getBySel('flyout-body-osquery').within(() => {
        cy.get('[data-grid-row-index]', { timeout: 6000000 }).should('have.length.at.least', 2);
      });
    });

    it('should substitute params in osquery ran from timelines alerts', () => {
      loadRuleAlerts(ruleName);
      navigateToRule(ruleName);
      cy.getBySel('send-alert-to-timeline-button').first().click();
      cy.getBySel('docTableExpandToggleColumn').first().click();
      takeOsqueryActionWithParams();
    });
  }
);
