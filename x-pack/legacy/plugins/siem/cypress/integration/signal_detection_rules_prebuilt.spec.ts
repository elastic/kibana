/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ELASTIC_RULES_BTN, RULES_ROW, RULES_TABLE } from '../screens/signal_detection_rules';

import {
  changeToThreeHundredRowsPerPage,
  loadPrebuiltDetectionRules,
  waitForLoadElasticPrebuiltDetectionRulesTableToBeLoaded,
  waitForPrebuiltDetectionRulesToBeLoaded,
  waitForRulesToBeLoaded,
} from '../tasks/signal_detection_rules';
import {
  goToManageSignalDetectionRules,
  waitForSignalsIndexToBeCreated,
  waitForSignalsPanelToBeLoaded,
} from '../tasks/detections';
import {
  esArchiverLoad,
  esArchiverLoadEmptyKibana,
  esArchiverUnloadEmptyKibana,
  esArchiverUnload,
} from '../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';

import { DETECTIONS } from '../urls/navigation';
import { SIGNALS } from '../screens/detections';

/* describe('Signal detection rules, prebuilt rules', () => {
  before(() => {
    esArchiverLoadEmptyKibana();
  });

  after(() => {
    esArchiverUnloadEmptyKibana();
  });

  it('Loads prebuilt rules', () => {
    loginAndWaitForPageWithoutDateRange(DETECTIONS);
    waitForSignalsPanelToBeLoaded();
    waitForSignalsIndexToBeCreated();
    goToManageSignalDetectionRules();
    waitForLoadElasticPrebuiltDetectionRulesTableToBeLoaded();
    loadPrebuiltDetectionRules();
    waitForPrebuiltDetectionRulesToBeLoaded();

    const expectedElasticRulesBtnText = 'Elastic rules (92)';
    cy.get(ELASTIC_RULES_BTN)
      .invoke('text')
      .should('eql', expectedElasticRulesBtnText);

    changeToThreeHundredRowsPerPage();
    waitForRulesToBeLoaded();

    const expectedNumberOfRules = 92;
    cy.get(RULES_TABLE).then($table => {
      cy.wrap($table.find(RULES_ROW).length).should('eql', expectedNumberOfRules);
    });
  });
});*/

describe('Deleting prebuilt rules', () => {
  beforeEach(() => {
    // esArchiverLoad('prebuilt_rules_loaded')
    loginAndWaitForPageWithoutDateRange(DETECTIONS);
    loginAndWaitForPageWithoutDateRange(DETECTIONS);
    waitForSignalsPanelToBeLoaded();
    waitForSignalsIndexToBeCreated();
    goToManageSignalDetectionRules();
  });

  afterEach(() => {
    // esArchiverUnload('prebuilt_rules_loaded')
  });

  it('Does not allow to delete one rule when more than one is selected', () => {
    cy.get('.euiTableRow .euiCheckbox__input')
      .first()
      .click({ force: true });
    cy.get('.euiTableRow .euiCheckbox__input')
      .eq(1)
      .click({ force: true });

    cy.get('[data-test-subj="euiCollapsedItemActionsButton"]').each(collapsedItemActionBtn => {
      cy.wrap(collapsedItemActionBtn).should('have.attr', 'disabled');
    });
  });

  it('Deletes and recovers one rule', () => {
    cy.get('[data-test-subj="euiCollapsedItemActionsButton"]')
      .first()
      .click({ force: true });
    cy.get('[data-test-subj="deleteRuleAction"]').click();

    cy.reload();
    changeToThreeHundredRowsPerPage();
    waitForRulesToBeLoaded();

    cy.get('[data-test-subj="reloadPrebuiltRulesBtn"]').should('exist');

    const expectedNumberOfRules = 91;

    const expectedElasticRulesBtnText = 'Elastic rules (91)';
    cy.get(ELASTIC_RULES_BTN)
      .invoke('text')
      .should('eql', expectedElasticRulesBtnText);

    cy.get(RULES_TABLE).then($table => {
      cy.wrap($table.find(RULES_ROW).length).should('eql', expectedNumberOfRules);
    });

    cy.get('[data-test-subj="reloadPrebuiltRulesBtn"]').click({ force: true });
    cy.get('[data-test-subj="reloadPrebuiltRulesBtn"]').should('not.exist');

    cy.reload();
    changeToThreeHundredRowsPerPage();
    waitForRulesToBeLoaded();

    const finalExpectedNumberOfRules = 92;
    cy.get(RULES_TABLE).then($table => {
      cy.wrap($table.find(RULES_ROW).length).should('eql', finalExpectedNumberOfRules);
    });

    const finalExpectedElasticRulesBtnText = 'Elastic rules (92)';
    cy.get(ELASTIC_RULES_BTN)
      .invoke('text')
      .should('eql', finalExpectedElasticRulesBtnText);
  });

  it('Deletes and recovers more than one rule', () => {
    cy.get('.euiTableRow .euiCheckbox__input')
      .first()
      .click({ force: true });
    cy.get('.euiTableRow .euiCheckbox__input')
      .eq(1)
      .click({ force: true });
    cy.get('[data-test-subj="bulkActions"] span').click({ force: true });
    cy.get('[data-test-subj="deleteRuleBulk"]').click();

    cy.reload();
    changeToThreeHundredRowsPerPage();
    waitForRulesToBeLoaded();

    cy.get('[data-test-subj="reloadPrebuiltRulesBtn"]').should('exist');

    const expectedNumberOfRules = 90;

    const expectedElasticRulesBtnText = 'Elastic rules (90)';
    cy.get(ELASTIC_RULES_BTN)
      .invoke('text')
      .should('eql', expectedElasticRulesBtnText);

    cy.get(RULES_TABLE).then($table => {
      cy.wrap($table.find(RULES_ROW).length).should('eql', expectedNumberOfRules);
    });

    cy.get('[data-test-subj="reloadPrebuiltRulesBtn"]').click({ force: true });
    cy.get('[data-test-subj="reloadPrebuiltRulesBtn"]').should('not.exist');

    cy.reload();
    changeToThreeHundredRowsPerPage();
    waitForRulesToBeLoaded();

    const finalExpectedNumberOfRules = 92;
    cy.get(RULES_TABLE).then($table => {
      cy.wrap($table.find(RULES_ROW).length).should('eql', finalExpectedNumberOfRules);
    });

    const finalExpectedElasticRulesBtnText = 'Elastic rules (92)';
    cy.get(ELASTIC_RULES_BTN)
      .invoke('text')
      .should('eql', finalExpectedElasticRulesBtnText);
  });
});
