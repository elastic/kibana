/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

type FieldType = 'keyword' | 'number' | 'date' | 'geo_point' | 'ip_range';
type FieldGroup = 'available' | 'empty' | 'meta';

export class LensFieldsListPage {
  readonly availableFieldsCount: Locator;
  readonly emptyFieldsCount: Locator;
  readonly popoverTitle: Locator;
  readonly topValuesChart: Locator;
  readonly topValuesBuckets: Locator;
  readonly statsFooter: Locator;
  readonly missingFieldStats: Locator;
  readonly distributionButton: Locator;
  readonly topValuesButton: Locator;
  readonly fieldSearchInput: Locator;

  constructor(private readonly page: ScoutPage) {
    this.availableFieldsCount = page.testSubj.locator('lnsIndexPatternAvailableFields-count');
    this.emptyFieldsCount = page.testSubj.locator('lnsIndexPatternEmptyFields-count');
    this.popoverTitle = page.testSubj.locator('lnsFieldListPanel-title');
    this.topValuesChart = page.testSubj.locator('lnsFieldListPanel-topValues');
    this.topValuesBuckets = page.testSubj.locator('lnsFieldListPanel-topValues-bucket');
    this.statsFooter = page.testSubj.locator('lnsFieldListPanel-statsFooter');
    this.missingFieldStats = page.testSubj.locator('lnsFieldListPanel-missingFieldStats');
    this.distributionButton = page.testSubj.locator(
      'lnsFieldListPanel-buttonGroup-distributionButton'
    );
    this.topValuesButton = page.testSubj.locator('lnsFieldListPanel-buttonGroup-topValuesButton');
    this.fieldSearchInput = page.testSubj.locator('lnsIndexPatternFieldSearch');
  }

  async getLastTopValuesBucket(): Promise<Locator> {
    const allBuckets = await this.topValuesBuckets.all();
    return allBuckets[allBuckets.length - 1];
  }

  getFieldLocator(fieldName: string): Locator {
    return this.page.testSubj.locator(`lnsFieldListPanelField-${fieldName}`);
  }

  getPopoverChart(): Locator {
    return this.page.testSubj.locator('lnsFieldListPanelFieldContent').locator('.echChart');
  }

  async findFieldIdsByType(type: FieldType, group: FieldGroup = 'available'): Promise<string[]> {
    const groupCapitalized = `${group[0].toUpperCase()}${group.slice(1).toLowerCase()}`;
    const fields = this.page.locator(
      `[data-test-subj="lnsIndexPattern${groupCapitalized}Fields"] .unifiedFieldListItemButton--${type}`
    );

    const allFields = await fields.all();
    const ids: string[] = [];
    for (const field of allFields) {
      const parent = field.locator('xpath=./..');
      const testSubj = await parent.getAttribute('data-test-subj');
      if (testSubj) {
        ids.push(testSubj);
      }
    }
    return ids;
  }

  async searchField(name: string): Promise<void> {
    await this.fieldSearchInput.clear();
    await this.fieldSearchInput.pressSequentially(name, { delay: 50 });
  }

  async clickField(fieldTestSubj: string): Promise<void> {
    await this.page.testSubj.click(fieldTestSubj);
  }

  async getStatsFooterRecordCount(): Promise<number> {
    const text = await this.statsFooter.innerText();
    const cleaned = text.replaceAll(/(Calculated from | records\.)/g, '').replace(',', '');
    return parseInt(cleaned, 10);
  }
}
