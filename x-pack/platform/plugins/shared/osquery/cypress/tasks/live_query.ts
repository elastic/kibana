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
  cy.getBySel(LIVE_QUERY_EDITOR).click({ force: true }).type(query, options);

export const inputQueryInFlyout = (
  query: string,
  options?: { parseSpecialCharSequences: boolean }
) => cy.get(OSQUERY_FLYOUT_BODY_EDITOR).click({ force: true }).type(query, options);

export const submitQuery = () => {
  // Monaco + react-hook-form debounce (OsqueryEditor debounces onChange by 500ms); leave headroom.
  cy.wait(2000);
  cy.get('#submit-button').should('not.be.disabled').click({ force: true });
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

// With queryHistoryRework, the pack status row shows `live-query-loading` until agents respond.
// The results grid (`osqueryResultsTable`) only mounts once there are rows — waiting on the
// wrapper alone can race. Wait for loading to clear, then for real grid cells (in the main
// Osquery page or inside the Security flyout).
export const checkResults = () => {
  cy.get('body', { timeout: 240000 }).should(($body) => {
    expect($body.find('[data-test-subj="live-query-loading"]')).to.have.length(0);
  });
  cy.get(
    `[data-test-subj="${RESULTS_TABLE}"] [data-test-subj="dataGridRowCell"], ` +
      `[data-test-subj="flyout-body-osquery"] [data-test-subj="dataGridRowCell"]`,
    { timeout: 240000 }
  ).should('have.length.above', 0);
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
  cy.getBySel('globalLoadingIndicator').should('not.exist');
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
  cy.getBySel('ruleSwitch')
    .invoke('attr', 'aria-checked')
    .then((ariaChecked) => {
      if (ariaChecked === 'true') {
        // Rule is on - turn off first, then back on to refresh
        cy.getBySel('ruleSwitch').click();
        cy.getBySel('ruleSwitch').should('have.attr', 'aria-checked', 'false');
        cy.getBySel('ruleSwitch').click();
        cy.getBySel('ruleSwitch').should('have.attr', 'aria-checked', 'true');
      } else {
        // Rule is off - turn it on
        cy.getBySel('ruleSwitch').click();
        cy.getBySel('ruleSwitch').should('have.attr', 'aria-checked', 'true');
      }
    });
};

// Pack results page header renders `AddToCaseButton` as a direct `EuiButtonEmpty`
// with `aria-label="Add to Case"` — used for single-query results.
const ADD_TO_CASE_HEADER_BUTTON = '[aria-label="Add to Case"]';
// Per-row kebab menu (queryHistoryRework pack_queries_status_table and history details flyout)
// renders `AddToCaseButton` as an `EuiContextMenuItem` inside a popover opened by the kebab.
const ADD_TO_CASE_ROW_KEBAB = '[data-test-subj^="packQueriesTableKebab-"]';

const selectCaseRow = (caseId: string) => {
  cy.contains('Select case');
  cy.getBySelContains(`cases-table-row-select-${caseId}`).click();
};

export const addToCaseFromResultsHeader = (caseId: string) => {
  cy.get(ADD_TO_CASE_HEADER_BUTTON).first().click();
  selectCaseRow(caseId);
};

export const addToCaseFromRowKebab = (caseId: string) => {
  cy.get(ADD_TO_CASE_ROW_KEBAB).first().click();
  cy.get('.euiContextMenuPanel').contains('Add to Case').click();
  selectCaseRow(caseId);
};

export const addLiveQueryToCase = (actionId: string, caseId: string) => {
  cy.getBySel(`row-${actionId}`).within(() => {
    cy.get('[aria-label="Details"]').click();
  });
  cy.contains('View history');
  addToCaseFromRowKebab(caseId);
};

const casesOsqueryResultRegex = /attached Osquery results[\s]?[\d]+[\s]?second(?:s)? ago/;
export const viewRecentCaseAndCheckResults = () => {
  cy.contains('View case').click();
  cy.contains(casesOsqueryResultRegex);
};

export const checkActionItemsInResults = ({
  cases,
}: {
  discover?: boolean;
  lens?: boolean;
  cases: boolean;
  timeline?: boolean;
}) => {
  checkResults();
  cy.get(`${ADD_TO_CASE_HEADER_BUTTON}, ${ADD_TO_CASE_ROW_KEBAB}`).should(
    cases ? 'exist' : 'not.exist'
  );
};

export const takeOsqueryActionWithParams = () => {
  // Force click due to element sometimes being covered by other flyout elements
  cy.getBySel('securitySolutionFlyoutFooterDropdownButton').click({ force: true });
  cy.getBySel('osquery-action-item').click();
  selectAllAgents();
  inputQuery("SELECT * FROM os_version where name='{{host.os.name}}';", {
    parseSpecialCharSequences: false,
  });
  cy.contains('Advanced').click();
  typeInECSFieldInput('tags{downArrow}{enter}');
  cy.getBySel('osqueryColumnValueSelect').type('platform_like{downArrow}{enter}');
  submitQuery();
  cy.getBySel('flyout-body-osquery', { timeout: 240000 }).should(($el) => {
    expect($el.find('[data-test-subj="live-query-loading"]')).to.have.length(0);
  });
  // Unified headers use `unifiedDataTableColumnTitle`; legacy uses `dataGridHeaderCell-*`.
  // ECS mapping may surface as `tags` or nested field names (e.g. host.tags).
  cy.getBySel('flyout-body-osquery', { timeout: 240000 }).should(($flyout) => {
    const titles = $flyout
      .find('[data-test-subj="unifiedDataTableColumnTitle"]')
      .toArray()
      .map((el) => el.textContent || '')
      .join(' ');
    const headerCells = $flyout.find('[data-test-subj^="dataGridHeaderCell-"]').text();
    const headerRow = $flyout.find('[data-test-subj^="dataGridHeader"]').text();
    const blob = `${titles} ${headerCells} ${headerRow}`;
    expect(/\btags\b|host\.tags/.test(blob)).to.eq(true);
  });
};

export const clickRuleName = (ruleName: string) => {
  cy.contains('a[data-test-subj="ruleName"]', ruleName).click({ force: true });
};

export const goToAlertsTab = () => {
  cy.get(ALERTS_TAB).click();
};
