/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// a11y tests for rules, logs and connectors page

import { v4 as uuidv4 } from 'uuid';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['settings', 'common', 'header']);
  const a11y = getService('a11y');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const toasts = getService('toasts');
  const find = getService('find');
  const comboBox = getService('comboBox');
  const retry = getService('retry');
  const es = getService('es');

  const ruleId = uuidv4().slice(0, 8);
  const ruleName = `a11y-test-rule-${ruleId}`;
  const indexName = `a11y-test-index-${ruleId}`;

  describe('Kibana Alerts - rules tab accessibility tests', () => {
    before(async () => {
      await es.indices.create({
        index: indexName,
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            value: { type: 'long' },
          },
        },
      });
      await es.index({
        index: indexName,
        refresh: 'wait_for',
        body: {
          '@timestamp': new Date().toISOString(),
          value: 1,
        },
      });

      await PageObjects.common.navigateToApp('management', {
        path: 'insightsAndAlerting/triggersActions',
      });
      await testSubjects.click('rulesTab');
      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    after(async () => {
      const errors: Error[] = [];
      try {
        await kibanaServer.savedObjects.cleanStandardList();
      } catch (e) {
        errors.push(e);
      }
      try {
        await es.indices.delete({ index: indexName, ignore_unavailable: true } as any);
      } catch (e) {
        errors.push(e);
      }
      if (errors.length > 0) throw errors[0];
    });

    it('a11y test on rules and connectors main page', async () => {
      await retry.waitForWithTimeout('rules list ready', 10000, async () => {
        const loading = await testSubjects.exists('centerJustifiedSpinner', { timeout: 500 });
        return !loading;
      });
      await a11y.testAppSnapshot({ profile: 'strictWcag22aa' });
    });

    it('a11y test on create rules panel', async () => {
      await retry.try(async () => {
        const firstRuleBtn = await testSubjects.exists('createFirstRuleButton', { timeout: 500 });
        if (firstRuleBtn) {
          await testSubjects.click('createFirstRuleButton');
        } else {
          await testSubjects.click('createRuleButton');
        }
      });

      await retry.waitForWithTimeout('rule type modal cards', 10000, async () => {
        return await testSubjects.exists('.index-threshold-SelectOption', { timeout: 500 });
      });

      await a11y.testAppSnapshot({ profile: 'strictWcag22aa' });

      await retry.try(async () => {
        await testSubjects.click('apm-LeftSidebarSelectOption');
      });
      await PageObjects.header.waitUntilLoadingHasFinished();
      await a11y.testAppSnapshot({ profile: 'strictWcag22aa' });

      await testSubjects.click('allRuleTypesButton');
      await testSubjects.click('.index-threshold-SelectOption');
    });

    it('a11y test on inputs on rules panel', async () => {
      await testSubjects.scrollIntoView('ruleDetailsNameInput');
      await testSubjects.setValue('ruleDetailsNameInput', ruleName);

      await testSubjects.scrollIntoView('selectIndexExpression');
      await testSubjects.click('selectIndexExpression');
      await comboBox.set('thresholdIndexesComboBox', indexName);

      await testSubjects.click('thresholdAlertTimeFieldSelect');
      await retry.try(async () => {
        const fieldOptions = await find.allByCssSelector('#thresholdTimeField option');
        if (fieldOptions.length < 2) throw new Error('no time field options');
        await fieldOptions[1].click();
      });
      await testSubjects.click('closePopover');

      await a11y.testAppSnapshot({ profile: 'strictWcag22aa' });
    });

    it('a11y test on save rule without connectors panel', async () => {
      await toasts.dismissIfExists();
      await testSubjects.click('rulePageFooterSaveButton');
      await testSubjects.existOrFail('confirmCreateRuleModal');
      await a11y.testAppSnapshot({ profile: 'strictWcag22aa' });
    });

    it('a11y test on alerts and logs page with one rule populated', async () => {
      await testSubjects.click('confirmCreateRuleModal > confirmModalConfirmButton');
      await PageObjects.header.waitUntilLoadingHasFinished();

      await PageObjects.common.navigateToApp('management', {
        path: 'insightsAndAlerting/triggersActions',
      });
      await testSubjects.click('rulesTab');
      await PageObjects.header.waitUntilLoadingHasFinished();

      await retry.waitForWithTimeout('created rule in list', 15000, async () => {
        const rows = await find.allByCssSelector('[data-test-subj="rulesTableCell-name"]');
        for (const row of rows) {
          const text = await row.getVisibleText();
          if (text.includes(ruleName)) return true;
        }
        return false;
      });

      await a11y.testAppSnapshot({ profile: 'strictWcag22aa' });

      await retry.try(async () => {
        await testSubjects.click('collapsedItemActions');
      });
      await testSubjects.click('deleteRule');
      await testSubjects.click('confirmModalConfirmButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    it('a11y test on logs tab', async () => {
      await testSubjects.click('logsTab');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await a11y.testAppSnapshot({ profile: 'strictWcag22aa' });
    });

    it('a11y test on connectors tab with create first connector message screen', async () => {
      await PageObjects.common.navigateToApp('triggersActionsConnectors');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await a11y.testAppSnapshot({ profile: 'strictWcag22aa' });
    });

    it('a11y test on create connector panel', async () => {
      await retry.try(async () => {
        const firstBtn = await testSubjects.exists('createFirstActionButton', { timeout: 500 });
        if (firstBtn) {
          await testSubjects.click('createFirstActionButton');
        } else {
          await testSubjects.click('createActionButton');
        }
      });
      await retry.waitForWithTimeout('connector type modal cards', 10000, async () => {
        return await testSubjects.exists('.email-card', { timeout: 500 });
      });
      await a11y.testAppSnapshot({ profile: 'strictWcag22aa' });
    });

    it('a11y test on email connectors', async () => {
      await testSubjects.click('.email-card');
      await retry.waitForWithTimeout('email connector form', 10000, async () => {
        return await testSubjects.exists('create-connector-flyout-back-btn', { timeout: 500 });
      });
      await a11y.testAppSnapshot({ profile: 'strictWcag22aa' });
      await testSubjects.click('create-connector-flyout-back-btn');
      await retry.waitForWithTimeout('connector chooser restored', 5000, async () => {
        return await testSubjects.exists('.email-card', { timeout: 500 });
      });
    });
  });
}
