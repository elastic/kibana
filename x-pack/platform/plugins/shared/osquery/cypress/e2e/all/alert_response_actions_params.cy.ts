/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { initializeDataViews } from '../../tasks/login';
import { cleanupRule, loadRule } from '../../tasks/api_fixtures';
import {
  inputQuery,
  loadRuleAlerts,
  navigateToRule,
  submitQuery,
  takeOsqueryActionWithParams,
} from '../../tasks/live_query';
import { OSQUERY_FLYOUT_BODY_EDITOR } from '../../screens/live_query';

describe(
  'Alert Response Actions',
  { tags: ['@ess', '@serverless', '@skipInServerlessMKI'] },
  () => {
    // Keep this describe in its own spec file: `substitutes params in osquery launched
    // from timeline alerts` leaves the timeline in an "unsaved" state (alert attached
    // via `send-alert-to-timeline-button`), which would trigger Chrome's native
    // `beforeunload` dialog on any subsequent `cy.visit` in the same spec.
    describe('Dynamic parameter substitution', () => {
      let ruleId: string;
      let ruleName: string;

      // Create the rule and populate alerts ONCE for the whole describe.
      // Calling `loadRuleAlerts` (which toggles the rule off/on) in `beforeEach`
      // caused the rule to hit its max-alert-limit across the 3 tests and the
      // `ruleSwitch` aria-checked update to stall.
      before(() => {
        initializeDataViews();
        // Scope alerts to those carrying `host.os.name` so the `{{host.os.name}}`
        // substitution below always has a value (a blind `_id:*` alert may lack it).
        loadRule(true, 'host.os.name:*').then((data) => {
          ruleId = data.id;
          ruleName = data.name;
          loadRuleAlerts(data.name);
        });
      });

      after(() => {
        cleanupRule(ruleId);
      });

      beforeEach(() => {
        navigateToRule(ruleName);
      });

      it('substitutes parameters in investigation guide queries', () => {
        cy.getBySel('expand-event').first().click();
        cy.getBySel('securitySolutionFlyoutInvestigationGuideButton').click();
        cy.contains('Get processes').should('be.visible').dblclick({ force: true });
        cy.get(OSQUERY_FLYOUT_BODY_EDITOR).click();
        cy.getBySel('flyout-body-osquery').contains(/SELECT \* FROM os_version where name='.*';/);
        cy.getBySel('flyout-body-osquery').find('input[value="host.os.platform"]').should('exist');
        cy.getBySel('flyout-body-osquery').contains('platform');
      });

      it(
        'substitutes alert parameters in a take-action query',
        { tags: ['@skipInServerless'] },
        () => {
          cy.getBySel('expand-event').first().click();
          cy.getBySel('securitySolutionFlyoutFooterDropdownButton').should(
            'not.contain',
            'Loading...'
          );
          cy.getBySel('securitySolutionFlyoutFooterDropdownButton').click({ force: true });
          cy.getBySel('osquery-action-item').click();
          cy.contains(/^1 agent selected/);
          cy.intercept('POST', '/api/osquery/live_queries').as('runLiveQuery');
          inputQuery("SELECT * FROM os_version where name='{{host.os.name}}';", {
            parseSpecialCharSequences: false,
          });
          submitQuery();
          // Assert substitution on the dispatched request rather than on live results:
          // the `{{host.os.name}}` placeholder must be replaced with the alert's host OS
          // name before the query is sent, independent of whether an agent returns rows.
          cy.wait('@runLiveQuery').should(({ request }) => {
            expect(request.body.query).to.match(/^SELECT \* FROM os_version where name='.+';$/);
            expect(request.body.query).to.not.contain('{{host.os.name}}');
          });
        }
      );

      it(
        'substitutes params in osquery launched from timeline alerts',
        { tags: ['@skipInServerless'] },
        () => {
          cy.getBySel('send-alert-to-timeline-button').first().click();
          cy.getBySel('docTableExpandToggleColumn').first().click();
          takeOsqueryActionWithParams();
        }
      );
    });
  }
);
