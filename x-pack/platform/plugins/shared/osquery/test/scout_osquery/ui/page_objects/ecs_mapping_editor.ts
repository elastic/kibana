/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { selectSingleAsPlainTextOption } from '../../common/combo_box_helpers';

export class EcsMappingEditorPage {
  public readonly mappingForm: Locator;
  public readonly advancedAccordion: Locator;

  constructor(private readonly page: ScoutPage) {
    this.mappingForm = this.page.testSubj.locator('ECSMappingEditorForm');
    this.advancedAccordion = this.page.testSubj.locator('advanced-accordion-content');
  }

  async toggleAdvancedSection(): Promise<void> {
    await this.advancedAccordion.click();
  }

  /**
   * Select a single osquery column value on the ECS-mapping editor's column
   * combobox at the given row index. Uses `selectSingleAsPlainTextOption`,
   * which clicks the option by `title` attribute — stable across EUI's
   * description-vs-value accessible-name rendering (the osquery column
   * combobox renders columns with description text but keeps `title` as the
   * raw column name).
   */
  async typeColumnValue(text: string, index = 0): Promise<void> {
    const cleanText = text.replace('{downArrow}{enter}', '');
    // eslint-disable-next-line playwright/no-nth-methods -- ECS row index is parameterized for multi-row mappings
    const rowLocator = this.page.testSubj.locator('osqueryColumnValueSelect').nth(index);
    await selectSingleAsPlainTextOption(this.page, {
      wrapper: { locator: rowLocator },
      optionName: cleanText,
    });
  }

  /**
   * Select a single ECS field on the ECS-mapping editor's field combobox at
   * the given row index. Same rationale as `typeColumnValue` — ECS field
   * options render the description as visible text, so we match by `title`.
   */
  async typeEcsField(text: string, index = 0): Promise<void> {
    const cleanText = text.replace('{downArrow}{enter}', '');
    // eslint-disable-next-line playwright/no-nth-methods -- ECS row index is parameterized for multi-row mappings
    const rowLocator = this.page.testSubj.locator('ECS-field-input').nth(index);
    await selectSingleAsPlainTextOption(this.page, {
      wrapper: { locator: rowLocator },
      optionName: cleanText,
    });
  }
}
