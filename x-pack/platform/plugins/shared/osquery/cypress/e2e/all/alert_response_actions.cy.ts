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
  loadCase,
  loadPack,
  loadRule,
  multiQueryPackFixture,
  packFixture,
} from '../../tasks/api_fixtures';
import {
  addToCase,
  checkActionItemsInResults,
  checkResults,
  clickRuleName,
  inputQuery,
  inputQueryInFlyout,
  loadRuleAlerts,
  navigateToRule,
  selectAllAgents,
  submitQuery,
  takeOsqueryActionWithParams,
  typeInECSFieldInput,
  viewRecentCaseAndCheckResults,
} from '../../tasks/live_query';
import { OSQUERY_FLYOUT_BODY_EDITOR } from '../../screens/live_query';
import {
  OSQUERY_RESPONSE_ACTION_ADD_BUTTON,
  RESPONSE_ACTIONS_ERRORS,
  RESPONSE_ACTIONS_ITEM_0,
  RESPONSE_ACTIONS_ITEM_1,
  RESPONSE_ACTIONS_ITEM_2,
} from '../../tasks/response_actions';
import {
  closeDateTabIfVisible,
  closeModalIfVisible,
  closeToastIfVisible,
  generateRandomStringName,
  interceptCaseId,
} from '../../tasks/integrations';

const UUID_REGEX = '[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}';

describe(
  'Alert Response Actions',
  { tags: ['@ess', '@serverless', '@skipInServerlessMKI'] },
  () => {
    describe('Automated action results — linked apps', () => {
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

      beforeEach(() => {
        navigateToRule(ruleName);
      });

      after(() => {
        cleanupRule(ruleId);
      });

      it('can visit discover from response action results', { tags: ['@ess'] }, () => {
        const discoverRegex = new RegExp(`action_id: ${UUID_REGEX}`);
        cy.getBySel('expand-event').first().click();
        cy.getBySel('securitySolutionFlyoutResponseSectionHeader').click();
        cy.getBySel('securitySolutionFlyoutResponseButton').click();
        cy.getBySel('responseActionsViewWrapper').should('exist');
        cy.getBySel('osquery-results-comment').first().should('exist');
        // Wait for osquery results to be indexed and rendered — the Discover URL
        // is generated async after logsDataView resolves, and Discover needs at
        // least one matching document to render `discoverDocTable` (otherwise it
        // renders the empty state instead).
        cy.getBySel('osquery-results-comment')
          .first()
          .within(() => {
            cy.getBySel('dataGridRowCell', { timeout: 120000 }).should('have.length.at.least', 1);
          });
        cy.get('[aria-label="View in Discover"]')
          .first()
          .should('have.attr', 'href')
          .and('match', /\/app\/discover/);
        cy.get('[aria-label="View in Discover"]')
          .first()
          .invoke('attr', 'href')
          .then((href) => {
            cy.visit(href as string);
            cy.getBySel('discoverDocTable', { timeout: 60000 }).within(() => {
              cy.contains(/action_data\.query\s*.+;/);
            });
            cy.contains(discoverRegex);
          });
      });

      it('can visit lens from response action results', { tags: ['@ess'] }, () => {
        const lensRegex = new RegExp(`Action ${UUID_REGEX} results`);
        cy.getBySel('expand-event').first().click();
        cy.getBySel('securitySolutionFlyoutResponseSectionHeader').click();
        cy.getBySel('securitySolutionFlyoutResponseButton').click();
        cy.getBySel('responseActionsViewWrapper').should('exist');
        cy.getBySel('osquery-results-comment').first().should('exist');
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
          const timelineRegex = new RegExp(`Added ${UUID_REGEX} to Timeline`);
          const filterRegex = new RegExp(`action_id: "${UUID_REGEX}"`);
          cy.getBySel('expand-event').first().click();
          cy.getBySel('securitySolutionFlyoutResponseSectionHeader').click();
          cy.getBySel('securitySolutionFlyoutResponseButton').click();
          cy.getBySel('responseActionsViewWrapper').should('exist');
          cy.getBySel('osquery-results-comment')
            .first()
            .within(() => {
              cy.get('[data-test-subj^="packQueriesTableKebab-"]').first().click();
            });
          cy.getBySel('add-to-timeline').click();
          cy.contains(timelineRegex);
          cy.getBySel('securitySolutionFlyoutNavigationCollapseDetailButton').click();
          cy.getBySel('timeline-bottom-bar').contains('Untitled timeline').click();
          cy.contains(filterRegex);
        }
      );
    });

    describe('Take action flyout — investigation guide + linked apps', () => {
      let ruleId: string;
      let ruleName: string;

      beforeEach(() => {
        initializeDataViews();
        loadRule().then((data) => {
          ruleId = data.id;
          ruleName = data.name;
          loadRuleAlerts(data.name);
        });
      });

      afterEach(() => {
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
        cy.contains('1 agent selected.');
        selectAllAgents();
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

    describe('Dynamic parameter substitution', () => {
      let ruleId: string;
      let ruleName: string;

      before(() => {
        initializeDataViews();
        loadRule(true).then((data) => {
          ruleId = data.id;
          ruleName = data.name;
        });
      });

      after(() => {
        cleanupRule(ruleId);
      });

      beforeEach(() => {
        loadRuleAlerts(ruleName);
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
          cy.get('[data-grid-row-index]', { timeout: 120000 }).should('have.length.at.least', 2);
        });
      });

      it('substitutes params in osquery launched from timeline alerts', () => {
        cy.getBySel('send-alert-to-timeline-button').first().click();
        cy.getBySel('docTableExpandToggleColumn').first().click();
        takeOsqueryActionWithParams();
      });
    });

    describe('Response action form validation and persistence', () => {
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
      });

      beforeEach(() => {
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

      afterEach(() => {
        cleanupPack(packId);
        cleanupPack(multiQueryPackId);
        cleanupRule(ruleId);
      });

      it('adds response actions with proper validation and persists them across edits', () => {
        cy.visit('/app/security/rules');
        clickRuleName(ruleName);
        cy.getBySel('globalLoadingIndicator').should('not.exist');
        cy.getBySel('editRuleSettingsLink').click();
        cy.getBySel('globalLoadingIndicator').should('not.exist');
        closeDateTabIfVisible();
        cy.getBySel('edit-rule-actions-tab').click();
        cy.getBySel('globalLoadingIndicator').should('not.exist');
        cy.contains('Response actions are run on each rule execution.');
        cy.getBySel(OSQUERY_RESPONSE_ACTION_ADD_BUTTON).click();

        cy.getBySel(RESPONSE_ACTIONS_ERRORS).within(() => {
          cy.contains('Query is a required field');
          cy.contains('The timeout value must be 60 seconds or higher.').should('not.exist');
        });

        cy.getBySel(RESPONSE_ACTIONS_ITEM_0).within(() => {
          cy.contains('Advanced').click();
          cy.getBySel('timeout-input').clear();
          cy.contains('The timeout value must be 60 seconds or higher.');
        });

        cy.getBySel(RESPONSE_ACTIONS_ERRORS).within(() => {
          cy.contains('Query is a required field');
          cy.contains('The timeout value must be 60 seconds or higher.');
        });

        cy.getBySel(RESPONSE_ACTIONS_ITEM_0).within(() => {
          cy.getBySel('timeout-input').type('6');
          cy.contains('The timeout value must be 60 seconds or higher.');
        });
        cy.getBySel(RESPONSE_ACTIONS_ERRORS).within(() => {
          cy.contains('Query is a required field');
          cy.contains('The timeout value must be 60 seconds or higher.');
        });
        cy.getBySel(RESPONSE_ACTIONS_ITEM_0).within(() => {
          cy.getBySel('timeout-input').type('6');
          cy.contains('The timeout value must be 60 seconds or higher.').should('not.exist');
        });
        cy.getBySel(RESPONSE_ACTIONS_ERRORS).within(() => {
          cy.contains('Query is a required field');
        });
        cy.getBySel(RESPONSE_ACTIONS_ITEM_0).within(() => {
          cy.getBySel('timeout-input').type('6');
        });
        cy.getBySel(RESPONSE_ACTIONS_ERRORS).within(() => {
          cy.contains('Query is a required field');
          cy.contains('The timeout value must be 60 seconds or higher.').should('not.exist');
        });

        cy.getBySel(RESPONSE_ACTIONS_ITEM_0).within(() => {
          cy.contains('Query is a required field');
          inputQuery('select * from uptime1');
        });
        cy.getBySel(OSQUERY_RESPONSE_ACTION_ADD_BUTTON).click();
        cy.getBySel(RESPONSE_ACTIONS_ITEM_1).within(() => {
          cy.contains('Run a set of queries in a pack').click();
        });
        cy.getBySel(RESPONSE_ACTIONS_ERRORS)
          .within(() => {
            cy.contains('Pack is a required field');
          })
          .should('exist');
        cy.getBySel(RESPONSE_ACTIONS_ITEM_1).within(() => {
          cy.contains('Pack is a required field');
          cy.getBySel('comboBoxInput').click();
          cy.getBySel('comboBoxInput').type(`${packName}`);
          cy.contains(`doesn't match any options`).should('not.exist');
          cy.getBySel('comboBoxInput').type('{downArrow}{enter}');
        });

        cy.getBySel(OSQUERY_RESPONSE_ACTION_ADD_BUTTON).click();

        cy.getBySel(RESPONSE_ACTIONS_ITEM_2)
          .within(() => {
            cy.contains('Query is a required field');
            inputQuery('select * from uptime');
            cy.contains('Query is a required field').should('not.exist');
            cy.contains('Advanced').click();
            typeInECSFieldInput('label{downArrow}{enter}');
            cy.getBySel('osqueryColumnValueSelect').type('days{downArrow}{enter}');
          })
          .clickOutside();

        cy.getBySel('ruleEditSubmitButton').click();
        cy.contains(`${ruleName} was saved`).should('exist');
        closeToastIfVisible();

        cy.getBySel('globalLoadingIndicator').should('not.exist');
        cy.getBySel('editRuleSettingsLink').click();
        cy.getBySel('globalLoadingIndicator').should('not.exist');
        cy.getBySel('edit-rule-actions-tab').click();
        cy.getBySel(RESPONSE_ACTIONS_ITEM_0).within(() => {
          cy.contains('select * from uptime1');
        });
        cy.getBySel(RESPONSE_ACTIONS_ITEM_2).within(() => {
          cy.contains('select * from uptime');
          cy.contains('Custom key/value pairs. e.g. {"application":"foo-bar","env":"production"}');
          cy.contains('Days of uptime');
        });
        cy.getBySel(RESPONSE_ACTIONS_ITEM_1)
          .within(() => {
            cy.getBySel('comboBoxSearchInput').should('have.value', packName);
            cy.getBySel('comboBoxInput').type('{selectall}{backspace}{enter}');
          })
          .clickOutside();
        cy.getBySel(RESPONSE_ACTIONS_ITEM_0).within(() => {
          cy.contains('select * from uptime1');
          cy.getBySel('remove-response-action').click();
        });
        cy.getBySel(RESPONSE_ACTIONS_ITEM_0)
          .within(() => {
            cy.getBySel('comboBoxSearchInput').click();
            cy.contains('Search for a pack to run');
            cy.contains('Pack is a required field');
            cy.getBySel('comboBoxInput').type(`${packName}{downArrow}{enter}`);
            cy.contains(packName);
          })
          .clickOutside();
        cy.getBySel(RESPONSE_ACTIONS_ITEM_1).within(() => {
          cy.contains('select * from uptime');
          cy.contains('Custom key/value pairs. e.g. {"application":"foo-bar","env":"production"}');
          cy.contains('Days of uptime');
        });

        cy.intercept('PUT', '/api/detection_engine/rules').as('saveRuleSingleQuery');

        cy.getBySel('ruleEditSubmitButton').click();
        cy.wait('@saveRuleSingleQuery', { timeout: 15000 }).should(({ request }) => {
          const oneQuery = [
            {
              interval: 3600,
              query: 'select * from uptime;',
              id: Object.keys(packData.queries)[0],
            },
          ];
          expect(request.body.response_actions[0].params.queries).to.deep.equal(oneQuery);
        });

        cy.contains(`${ruleName} was saved`).should('exist');
        closeToastIfVisible();

        cy.getBySel('globalLoadingIndicator').should('not.exist');
        cy.getBySel('editRuleSettingsLink').click();
        cy.getBySel('globalLoadingIndicator').should('not.exist');

        cy.getBySel('edit-rule-actions-tab').click();
        cy.getBySel(RESPONSE_ACTIONS_ITEM_0)
          .within(() => {
            cy.getBySel('comboBoxSearchInput').should('have.value', packName);
            cy.getBySel('comboBoxInput').type(
              `{selectall}{backspace}${multiQueryPackName}{downArrow}{enter}`
            );
            cy.contains('SELECT * FROM memory_info;');
            cy.contains('SELECT * FROM system_info;');
          })
          .clickOutside();

        cy.getBySel(RESPONSE_ACTIONS_ITEM_1)
          .within(() => {
            cy.contains('select * from uptime');
            cy.contains(
              'Custom key/value pairs. e.g. {"application":"foo-bar","env":"production"}'
            );
            cy.contains('Days of uptime');
          })
          .clickOutside();
        cy.intercept('PUT', '/api/detection_engine/rules').as('saveRuleMultiQuery');

        cy.contains('Save changes').click();
        cy.wait('@saveRuleMultiQuery', { timeout: 15000 }).should(({ request }) => {
          const threeQueries = [
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
          ];
          expect(request.body.response_actions[0].params.queries).to.deep.equal(threeQueries);
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
          cy.wait(1000);
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

      describe('Existing case', () => {
        let caseId: string;

        beforeEach(() => {
          loadCase('securitySolution').then((data) => {
            caseId = data.id;
          });
        });

        afterEach(() => {
          cleanupCase(caseId);
        });

        it('surfaces osquery results from the last action and adds them to a case', () => {
          cy.getBySel('expand-event').first().click();
          cy.getBySel('securitySolutionFlyoutResponseSectionHeader').click();
          cy.getBySel('securitySolutionFlyoutResponseButton').click();
          cy.getBySel('responseActionsViewWrapper').should('exist');
          cy.contains('select * from users;', { timeout: 60000 });
          cy.contains(/SELECT \* FROM os_version where name='.+'/, { timeout: 60000 });
          cy.getBySel('osquery-results-comment').each(($comment) => {
            cy.wrap($comment).within(() => {
              if ($comment.find('div .euiDataGridRow').length <= 0) {
                if ($comment.find('div .euiTabs').length > 0) {
                  cy.getBySel('osquery-status-tab').click();
                  cy.getBySel('osquery-results-tab').click();
                  cy.getBySel('dataGridRowCell', { timeout: 120000 }).should(
                    'have.lengthOf.above',
                    0
                  );
                }
              } else {
                cy.getBySel('dataGridRowCell', { timeout: 120000 }).should(
                  'have.lengthOf.above',
                  0
                );
              }
            });
          });
          checkActionItemsInResults({
            lens: true,
            discover: true,
            cases: true,
            timeline: true,
          });

          addToCase(caseId);
          viewRecentCaseAndCheckResults();
        });
      });
    });
  }
);
