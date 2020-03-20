/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { newRule } from '../objects/rule';

import {
  ABOUT_FALSE_POSITIVES,
  ABOUT_MITRE,
  ABOUT_RISK,
  ABOUT_SEVERITY,
  ABOUT_STEP,
  ABOUT_TAGS,
  ABOUT_TIMELINE,
  ABOUT_URLS,
  DEFINITION_CUSTOM_QUERY,
  DEFINITION_INDEX_PATTERNS,
  DEFINITION_STEP,
  RULE_NAME_HEADER,
  SCHEDULE_LOOPBACK,
  SCHEDULE_RUNS,
  SCHEDULE_STEP,
  ABOUT_RULE_DESCRIPTION,
} from '../screens/rule_details';
import {
  CUSTOM_RULES_BTN,
  ELASTIC_RULES_BTN,
  RISK_SCORE,
  RULE_NAME,
  RULES_ROW,
  RULES_TABLE,
  SEVERITY,
} from '../screens/signal_detection_rules';

import {
  createAndActivateRule,
  fillAboutRuleAndContinue,
  fillDefineRuleAndContinue,
} from '../tasks/create_new_rule';
import {
  changeToThreeHundredRowsPerPage,
  filterByCustomRules,
  goToCreateNewRule,
  goToRuleDetails,
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

describe('Signal detection rules', () => {
  before(() => {
    esArchiverLoadEmptyKibana();
    loginAndWaitForPageWithoutDateRange(DETECTIONS);
    waitForSignalsPanelToBeLoaded();
    waitForSignalsIndexToBeCreated();
    goToManageSignalDetectionRules();
    waitForLoadElasticPrebuiltDetectionRulesTableToBeLoaded();
  });

  after(() => {
    esArchiverUnloadEmptyKibana();
  });

  it('Loads prebuilt rules', () => {
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

  it('Creates and activates new rule', () => {
    goToCreateNewRule();
    fillDefineRuleAndContinue(newRule);
    fillAboutRuleAndContinue(newRule);
    createAndActivateRule();

    cy.get(CUSTOM_RULES_BTN)
      .invoke('text')
      .should('eql', 'Custom rules (1)');

    changeToThreeHundredRowsPerPage();
    waitForRulesToBeLoaded();

    const expectedNumberOfRules = 93;
    cy.get(RULES_TABLE).then($table => {
      cy.wrap($table.find(RULES_ROW).length).should('eql', expectedNumberOfRules);
    });

    filterByCustomRules();

    cy.get(RULES_TABLE).then($table => {
      cy.wrap($table.find(RULES_ROW).length).should('eql', 1);
    });
    cy.get(RULE_NAME)
      .invoke('text')
      .should('eql', newRule.name);
    cy.get(RISK_SCORE)
      .invoke('text')
      .should('eql', newRule.riskScore);
    cy.get(SEVERITY)
      .invoke('text')
      .should('eql', newRule.severity);
    cy.get('[data-test-subj="rule-switch"]').should('have.attr', 'aria-checked', 'true');

    goToRuleDetails();

    let expectedUrls = '';
    newRule.referenceUrls.forEach(url => {
      expectedUrls = expectedUrls + url;
    });
    let expectedFalsePositives = '';
    newRule.falsePositivesExamples.forEach(falsePositive => {
      expectedFalsePositives = expectedFalsePositives + falsePositive;
    });
    let expectedTags = '';
    newRule.tags.forEach(tag => {
      expectedTags = expectedTags + tag;
    });
    let expectedMitre = '';
    newRule.mitre.forEach(mitre => {
      expectedMitre = expectedMitre + mitre.tactic;
      mitre.techniques.forEach(technique => {
        expectedMitre = expectedMitre + technique;
      });
    });
    const expectedIndexPatterns = [
      'apm-*-transaction*',
      'auditbeat-*',
      'endgame-*',
      'filebeat-*',
      'packetbeat-*',
      'winlogbeat-*',
    ];

    cy.get(RULE_NAME_HEADER)
      .invoke('text')
      .should('eql', `${newRule.name} Beta`);

    cy.get(ABOUT_RULE_DESCRIPTION)
      .invoke('text')
      .should('eql', newRule.description);
    cy.get(ABOUT_STEP)
      .eq(ABOUT_SEVERITY)
      .invoke('text')
      .should('eql', newRule.severity);
    cy.get(ABOUT_STEP)
      .eq(ABOUT_RISK)
      .invoke('text')
      .should('eql', newRule.riskScore);
    cy.get(ABOUT_STEP)
      .eq(ABOUT_TIMELINE)
      .invoke('text')
      .should('eql', 'Default blank timeline');
    cy.get(ABOUT_STEP)
      .eq(ABOUT_URLS)
      .invoke('text')
      .should('eql', expectedUrls);
    cy.get(ABOUT_STEP)
      .eq(ABOUT_FALSE_POSITIVES)
      .invoke('text')
      .should('eql', expectedFalsePositives);
    cy.get(ABOUT_STEP)
      .eq(ABOUT_MITRE)
      .invoke('text')
      .should('eql', expectedMitre);
    cy.get(ABOUT_STEP)
      .eq(ABOUT_TAGS)
      .invoke('text')
      .should('eql', expectedTags);

    cy.get(DEFINITION_INDEX_PATTERNS).then(patterns => {
      cy.wrap(patterns).each((pattern, index) => {
        cy.wrap(pattern)
          .invoke('text')
          .should('eql', expectedIndexPatterns[index]);
      });
    });
    cy.get(DEFINITION_STEP)
      .eq(DEFINITION_CUSTOM_QUERY)
      .invoke('text')
      .should('eql', `${newRule.customQuery} `);

    cy.get(SCHEDULE_STEP)
      .eq(SCHEDULE_RUNS)
      .invoke('text')
      .should('eql', '5m');
    cy.get(SCHEDULE_STEP)
      .eq(SCHEDULE_LOOPBACK)
      .invoke('text')
      .should('eql', '1m');
  });
});
