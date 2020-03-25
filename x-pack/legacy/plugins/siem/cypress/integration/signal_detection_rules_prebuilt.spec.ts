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
import { esArchiverLoadEmptyKibana, esArchiverUnloadEmptyKibana } from '../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';

import { DETECTIONS } from '../urls/navigation';

describe('Signal detection rules, prebuilt rules', () => {
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
});
