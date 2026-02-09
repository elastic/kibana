/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitForAlertsToPopulate } from '@kbn/cypress-test-helper/src/services/alerting_services';
import { disableNewFeaturesTours } from './navigation';
import { getAdvancedButton } from '../screens/integrations';
import {
  LIVE_QUERY_EDITOR,
  OSQUERY_FLYOUT_BODY_EDITOR,
  RESULTS_TABLE,
} from '../screens/live_query';
import { ServerlessRoleName } from '../support/roles';

export const DEFAULT_QUERY = 'select * from processes;';
export const BIG_QUERY = 'select * from processes, users limit 110;';
export const ALERTS_TAB = '[data-test-subj="navigation-alerts"]';

export const selectAllAgents = () => {
  cy.getBySel('globalLoadingIndicator').should('not.exist');
  cy.getBySel('agentSelection').find('input').should('not.be.disabled');
  cy.getBySel('agentSelection').within(() => {
    cy.getBySel('comboBoxInput').click();
  });
  cy.contains('All agents').should('exist');
  cy.getBySel('agentSelection').within(() => {
    cy.getBySel('comboBoxInput').type('{downArrow}{enter}{esc}');
  });
  cy.contains('2 agents selected.');
};

export const clearInputQuery = () =>
  cy.getBySel(LIVE_QUERY_EDITOR).click().type(`{selectall}{backspace}`);

export const inputQuery = (query: string, options?: { parseSpecialCharSequences: boolean }) =>
  cy.getBySel(LIVE_QUERY_EDITOR).type(query, options);

export const inputQueryInFlyout = (
  query: string,
  options?: { parseSpecialCharSequences: boolean }
) => cy.get(OSQUERY_FLYOUT_BODY_EDITOR).type(query, options);

export const submitQuery = () => {
  cy.wait(1000); // wait for the validation to trigger - cypress is way faster than users ;)
  cy.contains('Submit').click();
};

export const fillInQueryTimeout = (timeout: string) => {
  cy.getBySel('advanced-accordion-content').within(() => {
    cy.getBySel('timeout-input').clear().type(timeout);
  });
};

export const verifyQueryTimeout = (timeout: string) => {
  getAdvancedButton().click();
  cy.getBySel('advanced-accordion-content').within(() => {
    cy.getBySel('timeout-input').should('have.value', timeout);
  });
};

// sometimes the results get stuck in the tests, this is a workaround
export const checkResults = () => {
  cy.getBySel(RESULTS_TABLE, { timeout: 240000 }).then(($table) => {
    if ($table.find('div .euiDataGridRow').length > 0) {
      cy.getBySel('dataGridRowCell', { timeout: 240000 }).should('have.lengthOf.above', 0);
    } else {
      cy.getBySel('osquery-status-tab').click({ multiple: true });
      cy.getBySel('osquery-results-tab').click({ multiple: true });
      cy.getBySel('dataGridRowCell', { timeout: 240000 }).should('have.lengthOf.above', 0);
    }
  });
};

export const typeInECSFieldInput = (text: string, index = 0) =>
  cy.getBySel('ECS-field-input').eq(index).type(text);

export const typeInOsqueryFieldInput = (text: string, index = 0) =>
  cy
    .getBySel('osqueryColumnValueSelect')
    .eq(index)
    .within(() => {
      cy.getBySel('comboBoxInput').click();
      cy.getBySel('globalLoadingIndicator').should('not.exist');
      cy.getBySel('comboBoxInput').type(text);
    });

export const getOsqueryFieldTypes = (value: 'Osquery value' | 'Static value', index = 0) => {
  cy.getBySel(`osquery-result-type-select-${index}`).click();
  cy.contains(value).click();

  if (value === 'Static value') {
    cy.contains('Osquery value').should('not.exist');
  } else {
    cy.contains('Static value').should('not.exist');
  }
};

export const deleteAndConfirm = (type: string) => {
  cy.get('span').contains(`Delete ${type}`).click();
  cy.contains(`Are you sure you want to delete this ${type}?`);
  cy.get('span').contains('Confirm').click();
  cy.get('[data-test-subj="globalToastList"]')
    .first()
    .contains('Successfully deleted')
    .contains(type);
};

export const toggleRuleOffAndOn = (ruleName: string) => {
  cy.visit('/app/security/rules');
  cy.wait(2000);
  cy.contains(ruleName)
    .parents('tr')
    .within(() => {
      cy.getBySel('ruleSwitch').should('have.attr', 'aria-checked', 'true');
      cy.getBySel('ruleSwitch').click();
      cy.getBySel('ruleSwitch').should('have.attr', 'aria-checked', 'false');
      cy.getBySel('ruleSwitch').click();
      cy.getBySel('ruleSwitch').should('have.attr', 'aria-checked', 'true');
    });
};

export const navigateToRule = (ruleName: string) => {
  cy.login(ServerlessRoleName.SOC_MANAGER, false);
  cy.visit('/app/security/rules', {
    onBeforeLoad: (win) => disableNewFeaturesTours(win),
  });
  clickRuleName(ruleName);
  goToAlertsTab();
  waitForAlertsToPopulate();
};

export const loadRuleAlerts = (ruleName: string) => {
  navigateToRule(ruleName);
  cy.getBySel('ruleSwitch').should('have.attr', 'aria-checked', 'true');
  cy.getBySel('ruleSwitch').click();
};

export const addToCase = (caseId: string) => {
  cy.contains('Add to Case').click();
  cy.contains('Select case');
  cy.getBySelContains(`cases-table-row-select-${caseId}`).click();
};

export const addLiveQueryToCase = (actionId: string, caseId: string) => {
  cy.getBySel(`row-${actionId}`).within(() => {
    cy.get('[aria-label="Details"]').click();
  });
  cy.contains('Live query details');
  addToCase(caseId);
};

const casesOsqueryResultRegex = /attached Osquery results[\s]?[\d]+[\s]?second(?:s)? ago/;
export const viewRecentCaseAndCheckResults = () => {
  cy.contains('View case').click();
  cy.contains(casesOsqueryResultRegex);
  checkResults();
};

export const checkActionItemsInResults = ({
  lens,
  discover,
  timeline,
  cases,
}: {
  discover: boolean;
  lens: boolean;
  cases: boolean;
  timeline: boolean;
}) => {
  checkResults();
  cy.contains('View in Discover').should(discover ? 'exist' : 'not.exist');
  cy.contains('View in Lens').should(lens ? 'exist' : 'not.exist');
  cy.contains('Add to Case').should(cases ? 'exist' : 'not.exist');
  cy.contains('Add to Timeline investigation').should(timeline ? 'exist' : 'not.exist');
};

export const takeOsqueryActionWithParams = () => {
  cy.getBySel('securitySolutionFlyoutFooterDropdownButton').click();
  cy.getBySel('osquery-action-item').click();
  selectAllAgents();
  inputQuery("SELECT * FROM os_version where name='{{host.os.name}}';", {
    parseSpecialCharSequences: false,
  });
  cy.contains('Advanced').click();
  typeInECSFieldInput('tags{downArrow}{enter}');
  cy.getBySel('osqueryColumnValueSelect').type('platform_like{downArrow}{enter}');
  cy.wait(1000);
  submitQuery();
  cy.getBySel('dataGridHeader').should('contain', 'tags', { timeout: 6000000 });
};

export const clickRuleName = (ruleName: string) => {
  cy.contains('a[data-test-subj="ruleName"]', ruleName).click({ force: true });
};

export const goToAlertsTab = () => {
  cy.get(ALERTS_TAB).click();
};
