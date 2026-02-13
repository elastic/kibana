/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, PageObjects, ScoutPage } from '@kbn/scout';
import { KibanaCodeEditorWrapper } from '@kbn/scout';

interface MetricsPagination {
  readonly container: Locator;
  readonly prevButton: Locator;
  readonly nextButton: Locator;
  getPageButton(pageIndex: number): Locator;
  getTotalPages(): Promise<number>;
}

function createPagination(parentContainer: Locator): MetricsPagination {
  const container = parentContainer.locator('nav[aria-label="Metrics pagination"]');
  return {
    container,
    prevButton: container.locator('[data-test-subj="pagination-button-previous"]'),
    nextButton: container.locator('[data-test-subj="pagination-button-next"]'),
    getPageButton: (pageIndex: number) =>
      container.locator(`[data-test-subj="pagination-button-${pageIndex}"]`),
    getTotalPages: async () => {
      const allButtons = container.locator('[data-test-subj^="pagination-button-"]');
      const navButtons = container.locator(
        '[data-test-subj="pagination-button-previous"], [data-test-subj="pagination-button-next"]'
      );
      const totalButtons = await allButtons.count();
      const navCount = await navButtons.count();
      return totalButtons - navCount;
    },
  };
}

export class MetricsExperiencePage {
  public readonly codeEditor: KibanaCodeEditorWrapper;
  public readonly container: Locator;
  public readonly grid: Locator;
  public readonly pagination: MetricsPagination;

  constructor(
    private readonly page: ScoutPage,
    private readonly discover: PageObjects['discover']
  ) {
    this.codeEditor = new KibanaCodeEditorWrapper(page);
    // metricsExperienceRendered is the outer wrapper containing header, grid, and pagination
    this.container = page.testSubj.locator('metricsExperienceRendered');
    this.grid = page.testSubj.locator('unifiedMetricsExperienceGrid');
    this.pagination = createPagination(this.container);
  }

  public async setEsqlQuery(query: string): Promise<void> {
    await this.codeEditor.setCodeEditorValue(query);
  }

  public async submitQuery(): Promise<void> {
    await this.page.testSubj.click('querySubmitButton');
  }

  public async runEsqlQuery(query: string): Promise<void> {
    await this.discover.selectTextBaseLang();
    await this.setEsqlQuery(query);
    await this.submitQuery();
    await this.discover.waitUntilSearchingHasFinished();
  }

  public getCardByIndex(index: number): Locator {
    return this.grid.locator(`[data-chart-index="${index}"]`);
  }

  public async getVisibleCardCount(): Promise<number> {
    return this.grid.locator('[data-chart-index]').count();
  }
}
