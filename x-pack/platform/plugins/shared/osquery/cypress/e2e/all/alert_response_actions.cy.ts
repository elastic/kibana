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
  multiQueryPackFixture,
  packFixture,
} from '../../tasks/api_fixtures';
import {
  checkResults,
  clickRuleName,
  inputQuery,
  inputQueryInFlyout,
  loadRuleAlerts,
  navigateToRule,
  submitQuery,
  takeOsqueryActionWithParams,
} from '../../tasks/live_query';
import { OSQUERY_FLYOUT_BODY_EDITOR } from '../../screens/live_query';
import {
  OSQUERY_RESPONSE_ACTION_ADD_BUTTON,
  RESPONSE_ACTIONS_ITEM_0,
  RESPONSE_ACTIONS_ITEM_1,
} from '../../tasks/response_actions';
import {
  closeDateTabIfVisible,
  closeModalIfVisible,
  closeToastIfVisible,
  generateRandomStringName,
  interceptCaseId,
} from '../../tasks/integrations';

// Failing: See https://github.com/elastic/kibana/issues/264525
describe.skip(
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

      it('runs a live query from the alert flyout and adds the action to Timeline', () => {
        const TIMELINE_NAME = 'Untitled timeline';
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
      });
    });

    // Pack response actions are the E2E-unique surface: the UI pack selection must
    // serialize into `response_actions[0].params.queries` via the rule-save HTTP
    // round-trip, and a pack swap must replace the full query set.
    //
    // Pure form validation (required fields, timeout min/max, ID uniqueness, ECS mapping
    // pairing) and inline-custom-query persistence are Jest-covered:
    //   - public/form/validations.test.ts
    //   - public/packs/queries/validations.test.ts
    //   - public/packs/queries/ecs_mapping_editor_field.test.ts
    // so this test sticks to the pack path only.
    describe('Pack response action persistence', () => {
      let multiQueryPackId: string;
      let multiQueryPackName: string;
      let ruleId: string;
      let ruleName: string;
      let packId: string;
      let packName: string;
      const packData = packFixture();
      const multiQueryPackData = multiQueryPackFixture();

      before(() => {
        initializeDataViews();
        loadPack(packData).then((data) => {
          packId = data.saved_object_id;
          packName = data.name;
        });
        loadPack(multiQueryPackData).then((data) => {
          multiQueryPackId = data.saved_object_id;
          multiQueryPackName = data.name;
        });
        loadRule().then((data) => {
          ruleId = data.id;
          ruleName = data.name;
        });
      });

      after(() => {
        cleanupPack(packId);
        cleanupPack(multiQueryPackId);
        cleanupRule(ruleId);
      });

      const openRuleActionsTab = () => {
        cy.getBySel('globalLoadingIndicator').should('not.exist');
        cy.getBySel('editRuleSettingsLink').click();
        cy.getBySel('globalLoadingIndicator').should('not.exist');
        closeDateTabIfVisible();
        cy.getBySel('edit-rule-actions-tab').click();
        cy.getBySel('globalLoadingIndicator').should('not.exist');
      };

      it('persists pack response actions across save/reopen and handles pack swap', () => {
        cy.visit('/app/security/rules');
        clickRuleName(ruleName);
        openRuleActionsTab();
        cy.contains('Response actions are run on each rule execution.');

        // Add a single-query pack as a response action.
        cy.getBySel(OSQUERY_RESPONSE_ACTION_ADD_BUTTON).click();
        cy.getBySel(RESPONSE_ACTIONS_ITEM_0).within(() => {
          cy.contains('Run a set of queries in a pack').click();
          cy.getBySel('comboBoxInput').click().type(`${packName}{downArrow}{enter}`);
        });

        cy.intercept('PUT', '/api/detection_engine/rules').as('saveRuleSingleQuery');
        cy.getBySel('ruleEditSubmitButton').click();
        cy.wait('@saveRuleSingleQuery', { timeout: 15000 }).should(({ request }) => {
          expect(request.body.response_actions[0].params.queries).to.deep.equal([
            {
              interval: 3600,
              query: 'select * from uptime;',
              id: Object.keys(packData.queries)[0],
            },
          ]);
        });
        cy.contains(`${ruleName} was saved`).should('exist');
        closeToastIfVisible();

        // Reopen — pack selection must survive the round-trip.
        openRuleActionsTab();
        cy.getBySel(RESPONSE_ACTIONS_ITEM_0).within(() => {
          cy.getBySel('comboBoxSearchInput').should('have.value', packName);
        });

        // Swap to the multi-query pack — save expands queries to 3.
        cy.getBySel(RESPONSE_ACTIONS_ITEM_0)
          .within(() => {
            cy.getBySel('comboBoxInput').type(
              `{selectall}{backspace}${multiQueryPackName}{downArrow}{enter}`
            );
            cy.contains('SELECT * FROM memory_info;');
            cy.contains('SELECT * FROM system_info;');
          })
          .clickOutside();

        cy.intercept('PUT', '/api/detection_engine/rules').as('saveRuleMultiQuery');
        cy.contains('Save changes').click();
        cy.wait('@saveRuleMultiQuery', { timeout: 15000 }).should(({ request }) => {
          expect(request.body.response_actions[0].params.queries).to.deep.equal([
            {
              interval: 3600,
              query: 'SELECT * FROM memory_info;',
              platform: 'linux',
              id: Object.keys(multiQueryPackData.queries)[0],
            },
            {
              interval: 3600,
              query: 'SELECT * FROM system_info;',
              id: Object.keys(multiQueryPackData.queries)[1],
            },
            {
              interval: 10,
              query: 'select opera_extensions.* from users join opera_extensions using (uid);',
              id: Object.keys(multiQueryPackData.queries)[2],
            },
          ]);
        });
      });
    });

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

    // Placed last: `substitutes params in osquery launched from timeline alerts`
    // leaves the timeline in an "unsaved" state (alert attached via
    // `send-alert-to-timeline-button`), which would trigger Chrome's native
    // `beforeunload` dialog on any subsequent `cy.visit` in the same spec.
    // Keeping this describe at the end of the file lets Cypress tear down the
    // browser between specs and discard the dirty state cleanly.
    describe('Dynamic parameter substitution', () => {
      let ruleId: string;
      let ruleName: string;

      // Create the rule and populate alerts ONCE for the whole describe.
      // Calling `loadRuleAlerts` (which toggles the rule off/on) in `beforeEach`
      // caused the rule to hit its max-alert-limit across the 3 tests and the
      // `ruleSwitch` aria-checked update to stall.
      before(() => {
        initializeDataViews();
        loadRule(true).then((data) => {
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

      it('runs a take-action query against all enrolled agents', () => {
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
          // at least 2 agents should have responded, sometimes it takes a while for the agents to respond
          cy.get('[data-grid-row-index]', { timeout: 180000 }).should('have.length.at.least', 2);
        });
      });

      it('substitutes params in osquery launched from timeline alerts', () => {
        cy.getBySel('send-alert-to-timeline-button').first().click();
        cy.getBySel('docTableExpandToggleColumn').first().click();
        takeOsqueryActionWithParams();
      });
    });
  }
);
