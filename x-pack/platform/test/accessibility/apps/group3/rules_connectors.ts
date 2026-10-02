/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// a11y tests for rules, logs and connectors page

import type { FtrProviderContext } from '../../ftr_provider_context';

const RULE_NAME = 'testRule';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['settings', 'common']);
  const a11y = getService('a11y');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const toasts = getService('toasts');
  const comboBox = getService('comboBox');
  const retry = getService('retry');
  const navigateToRules = async () => {
    await PageObjects.settings.navigateTo();
    await testSubjects.click('triggersActions');
  };

  describe('Kibana Alerts - rules tab accessibility tests', () => {
    before(async () => {
      await navigateToRules();
    });
    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('a11y test on rules and connectors main page', async () => {
      await a11y.testAppSnapshot();
    });

    it('a11y test on create rules panel', async () => {
      await testSubjects.click('createFirstRuleButton');
      await testSubjects.existOrFail('ruleTypeModal');
      await a11y.testAppSnapshot();
    });

    it('a11y test on inputs on rules panel', async () => {
      await testSubjects.click('apm-LeftSidebarSelectOption');
      await a11y.testAppSnapshot();
      await testSubjects.click('apm.anomaly-SelectOption');
      await testSubjects.existOrFail('ruleForm');
      await testSubjects.setValue('ruleDetailsNameInput', RULE_NAME);
      await comboBox.setCustom('ruleDetailsTagsInput', 'ruleTag');
      await a11y.testAppSnapshot();
    });

    it('a11y test on save rule without connectors panel', async () => {
      await toasts.dismissAll();
      await testSubjects.click('rulePageFooterSaveButton');
      await testSubjects.existOrFail('confirmCreateRuleModal');
      await a11y.testAppSnapshot();
    });

    it('a11y test on alerts and logs page with one rule populated', async () => {
      await testSubjects.click('confirmCreateRuleModal > confirmModalConfirmButton');
      // Creating a rule redirects to its details page, so go back to the rules list
      await navigateToRules();
      await testSubjects.existOrFail(`rulesListTableRowName-${RULE_NAME}`);
      await a11y.testAppSnapshot();
      await testSubjects.click('checkboxSelectAll');
      await testSubjects.click('showBulkActionButton');
      await testSubjects.click('bulkDelete');
      await testSubjects.click('rulesDeleteConfirmation > confirmModalConfirmButton');
    });

    it('a11y test on logs tab', async () => {
      await testSubjects.click('logsTab');
      await a11y.testAppSnapshot();
    });

    it('a11y test on connectors tab with create first connector message screen', async () => {
      await PageObjects.settings.navigateTo();
      await testSubjects.click('triggersActionsConnectors');
      await a11y.testAppSnapshot();
    });

    it('a11y test on create connector panel', async () => {
      await testSubjects.click('createFirstActionButton');
      await a11y.testAppSnapshot();
    });

    // Adding a11y test for one connector
    it('a11y test on email connectors', async () => {
      // A card click can be dropped while the grid settles, and the card is gone once the form is up.
      await retry.try(async () => {
        if (await testSubjects.exists('.email-card')) {
          await testSubjects.click('.email-card');
        }
        await testSubjects.existOrFail('nameInput', { timeout: 10_000 });
      });
      await a11y.testAppSnapshot();
      await testSubjects.click('create-connector-flyout-back-btn');
    });
  });
}
