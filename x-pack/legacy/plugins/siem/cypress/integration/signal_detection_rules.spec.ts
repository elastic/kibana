/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ELASTIC_RULES_BTN, RULES_TABLE, RULES_ROW } from '../screens/signal_detection_rules';

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
import { loginAndWaitForPageWithoutDateRange } from '../tasks/login';

import { DETECTIONS } from '../urls/navigation';

describe('Signal detection rules', () => {
  before(() => {
    loginAndWaitForPageWithoutDateRange(DETECTIONS);
    waitForSignalsPanelToBeLoaded();
    waitForSignalsIndexToBeCreated();
    goToManageSignalDetectionRules();
    waitForLoadElasticPrebuiltDetectionRulesTableToBeLoaded();
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
    cy.get('[data-test-subj="create-new-rule"]').click({ force: true });

    interface Mitre {
      tactic: string;
      techniques: string[];
    }

    interface Rule {
      customQuery: string;
      name: string;
      description: string;
      severity: string;
      riskScore: string;
      tags: string[];
      timelineTemplate?: string;
      referenceUrls: string[];
      falsePositivesExamples: string[];
      mitre: Mitre[];
    }

    const mitre1: Mitre = {
      tactic: 'Discovery (TA0007)',
      techniques: ['Cloud Service Discovery (T1526)', 'File and Directory Discovery (T1083)'],
    };

    const mitre2: Mitre = {
      tactic: 'Execution (TA0002)',
      techniques: ['CMSTP (T1191)'],
    };

    const newRule: Rule = {
      customQuery: 'hosts.name: *',
      name: 'New Rule Test',
      description: 'The new rule description.',
      severity: 'High',
      riskScore: '17',
      tags: ['test', 'newRule'],
      referenceUrls: ['https://www.google.com/', 'https://elastic.co/'],
      falsePositivesExamples: ['False1', 'False2'],
      mitre: [mitre1, mitre2],
    };

    cy.get('[data-test-subj="queryInput"]').type(newRule.customQuery);
    cy.get('[data-test-subj="continue"]')
      .should('exist')
      .click({ force: true });
    cy.get('[data-test-subj="queryInput"]').should('not.exist');

    cy.get(
      '[data-test-subj="detectionEngineStepAboutRuleName"] [data-test-subj="input"]'
    ).type(newRule.name, { force: true });
    cy.get(
      '[data-test-subj="detectionEngineStepAboutRuleDescription"] [data-test-subj="input"]'
    ).type(newRule.description, { force: true });
    cy.get('[data-test-subj="select"]').click({ force: true });

    cy.get(`#${newRule.severity.toLowerCase()}`).click();
    cy.get('.euiRangeInput')
      .clear({ force: true })
      .type(`${newRule.riskScore}`, { force: true });

    newRule.tags.forEach(tag => {
      cy.get(
        '[data-test-subj="detectionEngineStepAboutRuleTags"] [data-test-subj="comboBoxSearchInput"]'
      ).type(`${tag}{enter}`, { force: true });
    });
    cy.get('[data-test-subj="advancedSettings"] .euiAccordion__button').click({ force: true });

    newRule.referenceUrls.forEach((url, index) => {
      cy.get('[data-test-subj="detectionEngineStepAboutRuleReferenceUrls"] input')
        .eq(index)
        .type(url, { force: true });
      cy.get(
        '[data-test-subj="detectionEngineStepAboutRuleReferenceUrls"] .euiButtonEmpty__text'
      ).click({ force: true });
    });

    newRule.falsePositivesExamples.forEach((falsePositive, index) => {
      cy.get('[data-test-subj="detectionEngineStepAboutRuleFalsePositives"] input')
        .eq(index)
        .type(falsePositive, { force: true });
      cy.get(
        '[data-test-subj="detectionEngineStepAboutRuleFalsePositives"] .euiButtonEmpty__text'
      ).click({ force: true });
    });

    newRule.mitre.forEach((mitre, index) => {
      cy.get('[data-test-subj="mitreTactic"]')
        .eq(index)
        .click({ force: true });
      cy.contains('.euiContextMenuItem__text', mitre.tactic).click();

      mitre.techniques.forEach(technique => {
        cy.get('[data-test-subj="mitreTechniques"] [data-test-subj="comboBoxSearchInput"]')
          .eq(index)
          .type(`${technique}{enter}`, { force: true });
      });
      cy.get('[data-test-subj="addMitre"]').click({ force: true });
    });

    cy.get('[data-test-subj="about-continue"]')
      .should('exist')
      .click({ force: true });

    cy.get('[data-test-subj="create-activate"]').click({ force: true });
    cy.get('[data-test-subj="create-activate"]').should('not.exist');

    cy.get('[data-test-subj="show-custom-rules-filter-button"]')
      .invoke('text')
      .should('eql', 'Custom rules (1)');

    changeToThreeHundredRowsPerPage();
    waitForRulesToBeLoaded();

    const expectedNumberOfRules = 93;
    cy.get(RULES_TABLE).then($table => {
      cy.wrap($table.find(RULES_ROW).length).should('eql', expectedNumberOfRules);
    });

    cy.get('[data-test-subj="show-custom-rules-filter-button"]').click({ force: true });
    cy.get('[data-test-subj="loading-spinner"]').should('exist');
    cy.get('[data-test-subj="loading-spinner"]').should('not.exist');

    cy.get(RULES_TABLE).then($table => {
      cy.wrap($table.find(RULES_ROW).length).should('eql', 1);
    });

    cy.get('[data-test-subj="ruleName"]')
      .invoke('text')
      .should('eql', newRule.name);
    cy.get('[data-test-subj="riskScore"]')
      .invoke('text')
      .should('eql', newRule.riskScore);
    cy.get('[data-test-subj="severity"]')
      .invoke('text')
      .should('eql', newRule.severity);
    cy.get('[data-test-subj="rule-switch"]').should('have.attr', 'aria-checked', 'true');

    cy.get('[data-test-subj="ruleName"]').click({ force: true });

    const expectedIndexPatterns = [
      'apm-*-transaction*',
      'auditbeat-*',
      'endgame-*',
      'filebeat-*',
      'packetbeat-*',
      'winlogbeat-*',
    ];

    cy.get('.euiLoadingSpinner').should('exist');
    cy.get('.euiLoadingSpinner').should('not.exist');

    cy.get('[data-test-subj="definition"] .euiDescriptionList__description .euiBadge__text').then(
      patterns => {
        cy.wrap(patterns).each((pattern, index) => {
          cy.wrap(pattern)
            .invoke('text')
            .should('eql', expectedIndexPatterns[index]);
        });
      }
    );

    cy.get('[data-test-subj="definition"] .euiDescriptionList__description')
      .eq(1)
      .invoke('text')
      .should('eql', `${newRule.customQuery} `);

    cy.get('[data-test-subj="aboutRule"]  .euiDescriptionList__description')
      .eq(0)
      .invoke('text')
      .should('eql', newRule.description);
    cy.get('[data-test-subj="aboutRule"]  .euiDescriptionList__description')
      .eq(1)
      .invoke('text')
      .should('eql', newRule.severity);
    cy.get('[data-test-subj="aboutRule"]  .euiDescriptionList__description')
      .eq(2)
      .invoke('text')
      .should('eql', newRule.riskScore);
    cy.get('[data-test-subj="aboutRule"]  .euiDescriptionList__description')
      .eq(3)
      .invoke('text')
      .should('eql', 'Default blank timeline');

    let expectedUrls = '';

    newRule.referenceUrls.forEach(url => {
      expectedUrls = expectedUrls + url;
    });
    cy.get('[data-test-subj="aboutRule"]  .euiDescriptionList__description')
      .eq(4)
      .invoke('text')
      .should('eql', expectedUrls);

    let expectedFalsePositives = '';

    newRule.falsePositivesExamples.forEach(falsePositive => {
      expectedFalsePositives = expectedFalsePositives + falsePositive;
    });
    cy.get('[data-test-subj="aboutRule"]  .euiDescriptionList__description')
      .eq(5)
      .invoke('text')
      .should('eql', expectedFalsePositives);

    let expectedMitre = '';

    newRule.mitre.forEach(mitre => {
      expectedMitre = expectedMitre + mitre.tactic;
      mitre.techniques.forEach(technique => {
        expectedMitre = expectedMitre + technique;
      });
    });

    cy.get('[data-test-subj="aboutRule"]  .euiDescriptionList__description')
      .eq(6)
      .invoke('text')
      .should('eql', expectedMitre);

    let expectedTags = '';

    newRule.tags.forEach(tag => {
      expectedTags = expectedTags + tag;
    });

    cy.get('[data-test-subj="aboutRule"]  .euiDescriptionList__description')
      .eq(7)
      .invoke('text')
      .should('eql', expectedTags);

    cy.get('[data-test-subj="schedule"]  .euiDescriptionList__description')
      .eq(0)
      .invoke('text')
      .should('eql', '5m');
    cy.get('[data-test-subj="schedule"]  .euiDescriptionList__description')
      .eq(1)
      .invoke('text')
      .should('eql', '1m');
  });
});
