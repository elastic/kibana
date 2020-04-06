/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';
import { DETECTIONS } from '../urls/navigation';
import { goToManageSignalDetectionRules } from '../tasks/detections';
import {
  waitForLoadElasticPrebuiltDetectionRulesTableToBeLoaded,
  waitForRulesToBeLoaded,
} from '../tasks/signal_detection_rules';

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

    cy.get('[data-test-subj="ruleName"]')
      .eq(4)
      .invoke('text')
      .then(fifthRuleName => {
        cy.get('[data-test-subj="rule-switch"]')
          .eq(4)
          .click({ force: true });
        cy.get('[data-test-subj="rule-switch-loader"]').should('exist');
        cy.get('[data-test-subj="rule-switch-loader"]').should('not.exist');

        cy.get('[data-test-subj="ruleName"]')
          .eq(6)
          .invoke('text')
          .then(seventhRuleName => {
            cy.get('[data-test-subj="rule-switch"]')
              .eq(6)
              .click({ force: true });
            cy.get('[data-test-subj="rule-switch-loader"]').should('exist');
            cy.get('[data-test-subj="rule-switch-loader"]').should('not.exist');

            cy.get('[data-test-subj="tableHeaderSortButton"]').click({ force: true });
            waitForRulesToBeLoaded();
            cy.get('[data-test-subj="tableHeaderSortButton"]').click({ force: true });
            waitForRulesToBeLoaded();

            cy.get('[data-test-subj="ruleName"]')
              .eq(0)
              .should('have.text', fifthRuleName);
            cy.get('[data-test-subj="ruleName"]')
              .eq(1)
              .should('have.text', seventhRuleName);
          });
      });
  });
});
