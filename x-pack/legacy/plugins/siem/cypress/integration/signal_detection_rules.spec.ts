/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  FIFTH_RULE,
  FIRST_RULE,
  RULE_NAME,
  SECOND_RULE,
  SEVENTH_RULE,
} from '../screens/signal_detection_rules';

import { goToManageSignalDetectionRules } from '../tasks/detections';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';
import {
  activateRule,
  sortByActivatedRules,
  waitForLoadElasticPrebuiltDetectionRulesTableToBeLoaded,
  waitForRuleToBeActivated,
} from '../tasks/signal_detection_rules';

import { DETECTIONS } from '../urls/navigation';

describe('Signal detection rules', () => {
  before(() => {
    esArchiverLoad('prebuilt_rules_loaded');
  });

  after(() => {
    esArchiverUnload('prebuilt_rules_loaded');
  });

  it('Sorts by activated rules', () => {
    loginAndWaitForPageWithoutDateRange(DETECTIONS);
    goToManageSignalDetectionRules();
    waitForLoadElasticPrebuiltDetectionRulesTableToBeLoaded();
    cy.get(RULE_NAME)
      .eq(FIFTH_RULE)
      .invoke('text')
      .then(fifthRuleName => {
        activateRule(FIFTH_RULE);
        waitForRuleToBeActivated();
        cy.get(RULE_NAME)
          .eq(SEVENTH_RULE)
          .invoke('text')
          .then(seventhRuleName => {
            activateRule(SEVENTH_RULE);
            waitForRuleToBeActivated();
            sortByActivatedRules();

            cy.get(RULE_NAME)
              .eq(FIRST_RULE)
              .should('have.text', fifthRuleName);
            cy.get(RULE_NAME)
              .eq(SECOND_RULE)
              .should('have.text', seventhRuleName);
          });
      });
  });
});
