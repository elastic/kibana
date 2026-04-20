/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

export class EcsMappingEditorPage {
  constructor(private readonly page: ScoutPage) {}

  ecsMappingForm(): Locator {
    return this.page.testSubj.locator('ECSMappingEditorForm');
  }

  async toggleAdvancedSection(): Promise<void> {
    await this.page.testSubj.locator('advanced-accordion-content').click();
  }

  async typeColumnValue(text: string, index = 0): Promise<void> {
    // eslint-disable-next-line playwright/no-nth-methods -- ECS row index is parameterized for multi-row mappings
    const fieldSelect = this.page.testSubj.locator('osqueryColumnValueSelect').nth(index);
    const searchInput = fieldSelect.getByTestId('comboBoxSearchInput');
    const options = this.page.getByRole('option');
    // eslint-disable-next-line playwright/no-nth-methods -- pick first schema option in dropdown
    const option = options.first();
    const cleanText = text.replace('{downArrow}{enter}', '');

    for (let attempt = 0; attempt < 5; attempt++) {
      await searchInput.click();
      await this.page.waitForLoadingIndicatorHidden().catch(() => {});
      await searchInput.fill('');
      await searchInput.pressSequentially(cleanText);

      try {
        await option.waitFor({ state: 'visible', timeout: 10_000 });
        await option.click();

        return;
      } catch {
        await searchInput.press('Escape');
        await this.page.waitForLoadingIndicatorHidden().catch(() => {});
      }
    }

    await searchInput.click();
    await searchInput.fill('');
    await searchInput.pressSequentially(cleanText);
    await option.waitFor({ state: 'visible', timeout: 15_000 });
    await option.click();
  }

  async typeEcsField(text: string, index = 0): Promise<void> {
    // eslint-disable-next-line playwright/no-nth-methods -- ECS row index is parameterized for multi-row mappings
    const ecsWrapper = this.page.testSubj.locator('ECS-field-input').nth(index);
    const searchInput = ecsWrapper.getByTestId('comboBoxSearchInput');
    const cleanText = text.replace('{downArrow}{enter}', '');

    for (let attempt = 0; attempt < 5; attempt++) {
      await searchInput.click();
      await this.page.waitForLoadingIndicatorHidden().catch(() => {});
      await searchInput.fill('');
      await searchInput.pressSequentially(cleanText);

      const filteredOptions = this.page
        .locator('[role="option"]')
        .filter({ hasText: new RegExp(`^.*${cleanText}.*$`, 'i') });
      // eslint-disable-next-line playwright/no-nth-methods -- first option matching typed ECS field prefix
      const matchingOption = filteredOptions.first();

      try {
        await matchingOption.waitFor({ state: 'visible', timeout: 10_000 });
        await matchingOption.click();

        return;
      } catch {
        await searchInput.press('Escape');
        await this.page.waitForLoadingIndicatorHidden().catch(() => {});
      }
    }

    await searchInput.click();
    await searchInput.fill('');
    await searchInput.pressSequentially(cleanText);
    const filteredOptions = this.page
      .locator('[role="option"]')
      .filter({ hasText: new RegExp(`^.*${cleanText}.*$`, 'i') });
    // eslint-disable-next-line playwright/no-nth-methods -- first option matching typed ECS field prefix
    const matchingOption = filteredOptions.first();
    await matchingOption.waitFor({ state: 'visible', timeout: 15_000 });
    await matchingOption.click();
  }
}
