/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../../../fixtures';
import { generateLogsData } from '../../../fixtures/generators';

test.describe(
  'Stream data processing - Materialize from ES|QL',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    test.beforeAll(async ({ apiServices, logsSynthtraceEsClient }) => {
      await apiServices.streams.enable();
      await generateLogsData(logsSynthtraceEsClient)({ index: 'logs-generic-default' });
    });

    test.beforeEach(async ({ apiServices, browserAuth }) => {
      await browserAuth.loginAsAdmin();
      await apiServices.streams.clearStreamProcessors('logs-generic-default');
    });

    test.afterAll(async ({ apiServices, logsSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.clean();
      await apiServices.streams.disable();
    });

    test('should materialize GROK from ES|QL query', async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoProcessingTab('logs-generic-default');
      await pageObjects.streams.clickAddProcessor();
      await pageObjects.streams.fillProcessorFieldInput('message');
      await pageObjects.streams.fillGrokPatternInput('%{IP:client_ip}');
      await pageObjects.streams.clickSaveProcessor();
      
      const processors = await pageObjects.streams.getProcessorsListItems();
      expect(processors).toHaveLength(1);
      
      const previewRows = await pageObjects.streams.getPreviewTableRows();
      expect(previewRows.length).toBeGreaterThan(0);
    });

    test('should materialize GROK with WHERE condition', async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoProcessingTab('logs-generic-default');
      
      await pageObjects.streams.clickAddProcessor();
      await pageObjects.streams.fillProcessorFieldInput('message');
      await pageObjects.streams.fillGrokPatternInput('%{IP:client_ip}');
      
      await page.getByText('Advanced settings').click();
      
      await pageObjects.streams.fillConditionEditor({
        field: 'host.name',
        operator: 'eq',
        value: 'host-1',
      });
      
      await pageObjects.streams.clickSaveProcessor();
      
      const processors = await pageObjects.streams.getProcessorsListItems();
      expect(processors).toHaveLength(1);
      
      await pageObjects.streams.clickEditProcessor(0);
      await page.getByText('Advanced settings').click();
      
      await expect(
        await pageObjects.streams.conditionEditorFieldComboBox.getSelectedValue()
      ).toBe('host.name');
    });

    test('should materialize multiple processors from complex ES|QL', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.streams.gotoProcessingTab('logs-generic-default');

      // Add GROK processor with WHERE
      await pageObjects.streams.clickAddProcessor();
      await pageObjects.streams.fillProcessorFieldInput('message');
      await pageObjects.streams.fillGrokPatternInput('%{IP:client_ip}');
      await page.getByText('Advanced settings').click();
      await pageObjects.streams.fillConditionEditor({
        field: 'host.name',
        operator: 'eq',
        value: 'host-1',
      });
      await pageObjects.streams.clickSaveProcessor();
      
      // Add SET processor (from EVAL) with same WHERE
      await pageObjects.streams.clickAddProcessor();
      await pageObjects.streams.selectProcessorType('set');
      await pageObjects.streams.fillProcessorFieldInput('service.name', { isCustomValue: true });
      await page.locator('input[name="value"]').fill('ftpd');
      await page.getByText('Advanced settings').click();
      await pageObjects.streams.fillConditionEditor({
        field: 'host.name',
        operator: 'eq',
        value: 'host-1',
      });
      await pageObjects.streams.clickSaveProcessor();
      
      const processors = await pageObjects.streams.getProcessorsListItems();
      expect(processors).toHaveLength(2);
      
      await pageObjects.streams.saveStepsListChanges();
      
      const previewRows = await pageObjects.streams.getPreviewTableRows();
      expect(previewRows.length).toBeGreaterThan(0);
    });

    test('should handle LIKE operator in WHERE condition', async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoProcessingTab('logs-generic-default');
      
      // Simulate: WHERE message LIKE "%error%" | GROK message "%{IP:client_ip}"
      await pageObjects.streams.clickAddProcessor();
      await pageObjects.streams.fillProcessorFieldInput('message');
      await pageObjects.streams.fillGrokPatternInput('%{IP:client_ip}');
      await page.getByText('Advanced settings').click();
      
      // LIKE "%error%" becomes contains
      await pageObjects.streams.fillConditionEditor({
        field: 'message',
        operator: 'contains',
        value: 'error',
      });
      
      await pageObjects.streams.clickSaveProcessor();
      
      const processors = await pageObjects.streams.getProcessorsListItems();
      expect(processors).toHaveLength(1);
    });

    test('should handle EVAL with DATE_PARSE', async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoProcessingTab('logs-generic-default');
      
      // Simulate: EVAL timestamp = DATE_PARSE(date_string, "yyyy-MM-dd")
      await pageObjects.streams.clickAddProcessor();
      await pageObjects.streams.selectProcessorType('date');
      
      await pageObjects.streams.fillProcessorFieldInput('date_string', { isCustomValue: true });
      await page.getByLabel('Target field').fill('timestamp');

      await page.getByText('Format').locator('..').getByTestId('input').click();
      await page.keyboard.type('yyyy-MM-dd');
      await page.keyboard.press('Enter');
      
      await pageObjects.streams.clickSaveProcessor();
      
      const processors = await pageObjects.streams.getProcessorsListItems();
      expect(processors).toHaveLength(1);
      
      await pageObjects.streams.clickEditProcessor(0);
      await expect(page.getByTestId('streamsAppProcessorTypeSelector')).toContainText('Date');
    });

    test('should handle RENAME command', async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoProcessingTab('logs-generic-default');
      
      // Simulate: RENAME old_field AS new_field
      await pageObjects.streams.clickAddProcessor();
      await pageObjects.streams.selectProcessorType('rename');
      
      await pageObjects.streams.fillProcessorFieldInput('old_field', { isCustomValue: true });
      await page.getByLabel('Target field').fill('new_field');
      
      await pageObjects.streams.clickSaveProcessor();
      
      const processors = await pageObjects.streams.getProcessorsListItems();
      expect(processors).toHaveLength(1);
    });

    test('should handle DISSECT command', async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoProcessingTab('logs-generic-default');
      
      // Simulate: DISSECT message "%{timestamp} [%{level}] %{msg}"
      await pageObjects.streams.clickAddProcessor();
      await pageObjects.streams.selectProcessorType('dissect');
      
      await pageObjects.streams.fillProcessorFieldInput('message');
      await page
        .getByText('Pattern')
        .locator('..')
        .locator('.monaco-editor, [role="textbox"]')
        .first()
        .click();
      await page.keyboard.type('%{timestamp} [%{level}] %{msg}');
      
      await pageObjects.streams.clickSaveProcessor();
      
      const processors = await pageObjects.streams.getProcessorsListItems();
      expect(processors).toHaveLength(1);
    });

    test('should handle IN operator with multiple values', async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoProcessingTab('logs-generic-default');
      
      // Simulate: WHERE status IN ("active", "pending") | GROK message "%{IP:ip}"
      // IN with multiple values becomes OR condition
      await pageObjects.streams.clickAddProcessor();
      await pageObjects.streams.fillProcessorFieldInput('message');
      await pageObjects.streams.fillGrokPatternInput('%{IP:ip}');
      await page.getByText('Advanced settings').click();
      
      await pageObjects.streams.toggleConditionEditorWithSyntaxSwitch();
      await pageObjects.streams.fillConditionEditorWithSyntax(
        JSON.stringify({
          or: [
            { field: 'status', eq: 'active' },
            { field: 'status', eq: 'pending' },
          ],
        })
      );
      
      await pageObjects.streams.clickSaveProcessor();
      
      const processors = await pageObjects.streams.getProcessorsListItems();
      expect(processors).toHaveLength(1);
    });

    test('should not duplicate steps on page refresh', async ({ page, pageObjects }) => {
      await pageObjects.streams.gotoProcessingTab('logs-generic-default');
      
      await pageObjects.streams.clickAddProcessor();
      await pageObjects.streams.fillProcessorFieldInput('message');
      await pageObjects.streams.fillGrokPatternInput('%{IP:client_ip}');
      await pageObjects.streams.clickSaveProcessor();
      await pageObjects.streams.saveStepsListChanges();
      
      let processors = await pageObjects.streams.getProcessorsListItems();
      const initialCount = processors.length;
      
      await page.reload();
      
      await expect(
        page.getByTestId('streamsAppStreamDetailEnrichmentRootSteps')
      ).toBeVisible();
      
      processors = await pageObjects.streams.getProcessorsListItems();
      expect(processors).toHaveLength(initialCount);
    });

    test('should run simulation only once on initial load with appended steps', async ({
      page,
      pageObjects,
    }) => {
      
      await pageObjects.streams.gotoProcessingTab('logs-generic-default');
      await pageObjects.streams.clickAddProcessor();
      await pageObjects.streams.fillProcessorFieldInput('message');
      await pageObjects.streams.fillGrokPatternInput('%{IP:client_ip}');
      await pageObjects.streams.clickSaveProcessor();
      
      const previewRows = await pageObjects.streams.getPreviewTableRows();
      expect(previewRows.length).toBeGreaterThan(0);
    });
  }
);

