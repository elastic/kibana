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
}

function createPagination(parentContainer: Locator): MetricsPagination {
  const container = parentContainer.locator('[data-test-subj="metricsExperienceGridPagination"]');
  return {
    container,
    prevButton: container.locator('[data-test-subj="pagination-button-previous"]'),
    nextButton: container.locator('[data-test-subj="pagination-button-next"]'),
    getPageButton: (pageIndex: number) =>
      container.locator(`[data-test-subj="pagination-button-${pageIndex}"]`),
  };
}

export class MetricsExperiencePage {
  private readonly codeEditor: KibanaCodeEditorWrapper;
  public readonly container: Locator;
  public readonly grid: Locator;
  public readonly cards: Locator;
  public readonly pagination: MetricsPagination;
  public readonly searchButton: Locator;
  public readonly searchInput: Locator;
  public readonly emptyState: Locator;

  constructor(
    private readonly page: ScoutPage,
    private readonly discover: PageObjects['discover']
  ) {
    this.codeEditor = new KibanaCodeEditorWrapper(page);
    // metricsExperienceRendered is the outer wrapper containing header, grid, and pagination
    this.container = page.testSubj.locator('metricsExperienceRendered');
    this.grid = page.testSubj.locator('unifiedMetricsExperienceGrid');
    this.cards = this.grid.locator('[data-chart-index]');
    this.pagination = createPagination(this.container);
    this.searchButton = page.testSubj.locator('metricsExperienceToolbarSearch');
    this.searchInput = page.testSubj.locator('metricsExperienceGridToolbarSearch');
    this.emptyState = page.testSubj.locator('metricsExperienceNoData');
  }

  /**
   * Runs an ES|QL query and waits for results.
   */
  public async runEsqlQuery(query: string): Promise<void> {
    await this.discover.selectTextBaseLang();
    await this.codeEditor.setCodeEditorValue(query);
    await this.page.testSubj.click('querySubmitButton');
    await this.discover.waitUntilSearchingHasFinished();
  }

  public getCardByIndex(index: number): Locator {
    return this.grid.locator(`[data-chart-index="${index}"]`);
  }

  public async searchMetric(term: string): Promise<void> {
    const isInputVisible = await this.searchInput.isVisible();
    if (!isInputVisible) {
      await this.searchButton.click();
    }
    await this.searchInput.fill(term);
  }

  public async clearSearch(): Promise<void> {
    await this.searchInput.clear();
  }
}
