/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

test.describe('Inference Management UI', { tag: [...tags.deploymentAgnostic] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.inferenceManagement.goto();
  });

  test('group by options and accordion behavior', async ({ pageObjects }) => {
    const { inferenceManagement } = pageObjects;

    await test.step('defaults to group by models', async () => {
      await expect(inferenceManagement.groupByButton).toContainText('Model Author');
      await expect(inferenceManagement.groupByTablesContainer).toBeVisible();
      await expect(inferenceManagement.endpointTable).toBeHidden();
      await expect(inferenceManagement.getGroupAccordion('elastic')).toBeVisible();
      await expect(inferenceManagement.getGroupTable('elastic')).toBeVisible();
    });

    await test.step('can switch to group by none', async () => {
      await inferenceManagement.selectGroupByOption('none');
      await expect(inferenceManagement.groupByButton).toContainText('None');
      await expect(inferenceManagement.endpointTable).toBeVisible();
    });

    await test.step('can switch to group by service', async () => {
      await inferenceManagement.selectGroupByOption('service');
      await expect(inferenceManagement.groupByButton).toContainText('Service');
      await expect(inferenceManagement.groupByTablesContainer).toBeVisible();
      await expect(inferenceManagement.endpointTable).toBeHidden();
      await expect(inferenceManagement.getGroupAccordion('elasticsearch')).toBeVisible();
      await expect(inferenceManagement.getGroupTable('elasticsearch')).toBeVisible();
    });

    await test.step('can collapse and expand group accordions', async () => {
      const groupId = 'elastic';
      await inferenceManagement.selectGroupByOption('model');
      await expect(inferenceManagement.groupByTablesContainer).toBeVisible();

      await expect(inferenceManagement.getAccordionToggle(groupId)).toHaveAttribute(
        'aria-expanded',
        'true'
      );

      await inferenceManagement.toggleGroupAccordion(groupId);
      await expect(inferenceManagement.getAccordionToggle(groupId)).toHaveAttribute(
        'aria-expanded',
        'false'
      );

      await inferenceManagement.toggleGroupAccordion(groupId);
      await expect(inferenceManagement.getAccordionToggle(groupId)).toHaveAttribute(
        'aria-expanded',
        'true'
      );
    });
  });

  test('tabular view with group by none', async ({ pageObjects }) => {
    const { inferenceManagement } = pageObjects;

    await inferenceManagement.selectGroupByOption('none');

    await test.step('page header and table load correctly', async () => {
      await expect(inferenceManagement.pageHeader).toBeVisible();
      await expect(inferenceManagement.eisDocumentationLink).toBeVisible();
      await expect(inferenceManagement.apiDocumentationLink).toBeVisible();
      await expect(inferenceManagement.viewYourModelsLink).toBeVisible();
      await expect(inferenceManagement.addEndpointButton).toBeVisible();

      await expect(inferenceManagement.searchField).toBeVisible();
      await expect(inferenceManagement.typeField).toBeVisible();
      await expect(inferenceManagement.serviceField).toBeVisible();

      const rows = await inferenceManagement.getTableRows();
      expect(await rows.count()).toBeGreaterThan(1);

      const allText = await inferenceManagement.endpointTable.textContent();
      expect(allText).toContain('.elser-2');
      expect(allText).toContain('.multilingual-e5');
    });

    await test.step('displays model column', async () => {
      const modelCells = await inferenceManagement.getModelCells();
      expect(await modelCells.count()).toBeGreaterThan(0);
    });

    await test.step('can search by model name', async () => {
      await inferenceManagement.searchField.clear();
      await inferenceManagement.searchField.fill('elser_model');

      const rows = await inferenceManagement.getTableRows();
      expect(await rows.count()).toBeGreaterThan(0);

      const allText = await inferenceManagement.endpointTable.textContent();
      expect(allText?.toLowerCase()).toContain('elser');

      await inferenceManagement.searchField.clear();
    });

    await test.step('preconfigured endpoints cannot be deleted', async () => {
      await inferenceManagement.getFirstRowActionsButton().click();
      await expect(inferenceManagement.preconfiguredDeleteAction).toBeVisible();
      await expect(inferenceManagement.preconfiguredDeleteAction).toBeDisabled();
    });
  });

  test('endpoint stats bar', async ({ pageObjects }) => {
    const { inferenceManagement } = pageObjects;

    await test.step('displays stats with counts', async () => {
      await expect(inferenceManagement.endpointStats).toBeVisible();
      await expect(inferenceManagement.modelsCount).toBeVisible();
      await expect(inferenceManagement.endpointsCount).toBeVisible();

      const modelsText = await inferenceManagement.modelsCount.textContent();
      expect(parseInt(modelsText ?? '0', 10)).toBeGreaterThan(0);

      const endpointsText = await inferenceManagement.endpointsCount.textContent();
      expect(parseInt(endpointsText ?? '0', 10)).toBeGreaterThan(0);
    });

    await test.step('stats update on filter', async () => {
      const initialCountText = await inferenceManagement.endpointsCount.textContent();
      const initialCount = parseInt(initialCountText ?? '0', 10);

      await inferenceManagement.searchField.clear();
      await inferenceManagement.searchField.fill('elser');

      await expect
        .poll(async () => {
          const filteredText = await inferenceManagement.endpointsCount.textContent();
          return parseInt(filteredText ?? '0', 10);
        })
        .toBeLessThan(initialCount);

      await inferenceManagement.searchField.clear();
    });
  });

  test('copy endpoint id', async ({ pageObjects }) => {
    const { inferenceManagement } = pageObjects;

    await inferenceManagement.getFirstRowActionsButton().click();
    await expect(inferenceManagement.copyIdAction).toBeVisible();
    await inferenceManagement.copyIdAction.click();
  });

  test('create inference flyout', async ({ pageObjects }) => {
    const { inferenceManagement } = pageObjects;

    await test.step('renders with provider selection and task type', async () => {
      await inferenceManagement.addEndpointButton.click();
      await expect(inferenceManagement.inferenceFlyout).toBeVisible();

      await inferenceManagement.providerSelect.click();
      await inferenceManagement.providerSearchBox.fill('Cohere');
      await inferenceManagement.getProviderOption('Cohere').click();

      await expect(inferenceManagement.apiKeyPassword).toBeVisible();
      await inferenceManagement.additionalSettingsButton.click();
      await inferenceManagement.getTaskTypeOption('completion').click();
      await expect(inferenceManagement.endpointInputField).toBeVisible();

      const endpointText = await inferenceManagement.endpointInputField.textContent();
      expect(endpointText).toContain('cohere-completion');

      await expect(inferenceManagement.submitButton).toBeEnabled();
    });

    await test.step('allows custom headers', async () => {
      await inferenceManagement.goto();
      await inferenceManagement.addEndpointButton.click();
      await expect(inferenceManagement.inferenceFlyout).toBeVisible();

      await inferenceManagement.providerSelect.click();
      await inferenceManagement.providerSearchBox.fill('OpenAI');
      await inferenceManagement.getProviderOption('OpenAI').click();

      await expect(inferenceManagement.moreOptionsAccordion).toBeVisible();
      await inferenceManagement.moreOptionsAccordionButton.click();

      await expect(inferenceManagement.headersSwitchUnchecked).toBeVisible();
      await inferenceManagement.headersSwitchUnchecked.click();
      await expect(inferenceManagement.headersSwitchChecked).toBeVisible();

      await inferenceManagement.getHeaderKeyInput(0).fill('First-header-key');
      await inferenceManagement.getHeaderValueInput(0).fill('First-header-value');
      await expect(inferenceManagement.getHeaderDeleteButton(0)).toBeVisible();

      await inferenceManagement.headersAddButton.click();
      await inferenceManagement.getHeaderKeyInput(1).fill('Second-header-key');
      await inferenceManagement.getHeaderValueInput(1).fill('Second-header-value');
      await expect(inferenceManagement.getHeaderDeleteButton(1)).toBeVisible();

      await inferenceManagement.getHeaderDeleteButton(0).click();
      await expect(inferenceManagement.getHeaderKeyInput(0)).toHaveValue('Second-header-key');
      await expect(inferenceManagement.getHeaderValueInput(0)).toHaveValue('Second-header-value');

      await expect(inferenceManagement.apiKeyPassword).toBeVisible();
      await inferenceManagement.additionalSettingsButton.click();
      await inferenceManagement.getTaskTypeOption('completion').click();
      await expect(inferenceManagement.endpointInputField).toBeVisible();

      const endpointText = await inferenceManagement.endpointInputField.textContent();
      expect(endpointText).toContain('openai-completion');

      await expect(inferenceManagement.submitButton).toBeEnabled();
    });
  });

  test('edit inference flyout', async ({ pageObjects }) => {
    const { inferenceManagement } = pageObjects;

    await inferenceManagement.getFirstRowActionsButton().click();
    await expect(inferenceManagement.viewEndpointAction).toBeVisible();
    await inferenceManagement.viewEndpointAction.click();

    await expect(inferenceManagement.inferenceFlyout).toBeVisible();

    const providerText = await inferenceManagement.providerSelect.textContent();
    expect(providerText).toContain('Elasticsearch');

    const modelText = await inferenceManagement.modelIdInput.textContent();
    expect(modelText).toContain('.elser_model_2');

    await expect(inferenceManagement.submitButton).toBeHidden();
  });

  test('has embedded dev console', async ({ pageObjects }) => {
    const { inferenceManagement } = pageObjects;

    await expect(inferenceManagement.consoleControlBar).toBeVisible();
    await expect(inferenceManagement.consoleBody).toBeHidden();

    await inferenceManagement.clickConsoleControlBar();

    await expect(inferenceManagement.consoleFullscreenToggle).toBeVisible();
    await expect(inferenceManagement.consoleBody).toBeVisible();

    await inferenceManagement.clickConsoleControlBar();

    await expect(inferenceManagement.consoleBody).toBeHidden();
  });
});
