/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, PageObjects, ScoutPage } from '@kbn/scout';
import { KibanaCodeEditorWrapper } from '@kbn/scout';

export class MetricsExperiencePage {
  public readonly codeEditor: KibanaCodeEditorWrapper;
  public readonly grid: Locator;

  constructor(
    private readonly page: ScoutPage,
    private readonly discover: PageObjects['discover']
  ) {
    this.codeEditor = new KibanaCodeEditorWrapper(page);
    this.grid = page.testSubj.locator('unifiedMetricsExperienceGrid');
  }

  async setEsqlQuery(query: string) {
    await this.codeEditor.setCodeEditorValue(query);
  }

  async submitQuery() {
    await this.page.testSubj.click('querySubmitButton');
  }

  async runEsqlQuery(query: string) {
    await this.discover.selectTextBaseLang();
    await this.setEsqlQuery(query);
    await this.submitQuery();
    await this.discover.waitUntilSearchingHasFinished();
  }

  getCardByIndex(index: number): Locator {
    return this.grid.locator(`[data-chart-index="${index}"]`);
  }
}
