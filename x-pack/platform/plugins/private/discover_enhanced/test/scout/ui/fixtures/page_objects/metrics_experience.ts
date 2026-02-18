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

interface DimensionsPagination {
  readonly container: Locator;
  readonly prevButton: Locator;
  readonly nextButton: Locator;
  getPageButton(pageIndex: number): Locator;
}

interface FlyoutOverviewTab {
  readonly tab: Locator;
  readonly descriptionList: Locator;
  readonly dimensionsPagination: DimensionsPagination;
}

interface FlyoutEsqlQueryTab {
  readonly tab: Locator;
  readonly codeBlock: Locator;
}

interface MetricsFlyout {
  readonly container: Locator;
  readonly overview: FlyoutOverviewTab;
  readonly esqlQuery: FlyoutEsqlQueryTab;
}

interface ChartActions {
  readonly viewDetails: Locator;
  readonly copyToDashboard: Locator;
  readonly explore: Locator;
}

interface BreakdownSelector {
  readonly button: Locator;
  readonly search: Locator;
  readonly selectable: Locator;
  getOption(dimensionName: string): Locator;
  getButtonWithSelectedDimension(dimensionName: string): Locator;
}

function createBreakdownSelector(page: ScoutPage): BreakdownSelector {
  return {
    button: page.testSubj.locator('metricsExperienceBreakdownSelectorButton'),
    search: page.testSubj.locator('metricsExperienceBreakdownSelectorSelectorSearch'),
    selectable: page.testSubj.locator('metricsExperienceBreakdownSelectorSelectable'),
    getOption: (dimensionName: string) =>
      page.testSubj.locator(`metricsExperienceBreakdownSelectorOption-${dimensionName}`),
    getButtonWithSelectedDimension: (dimensionName: string) =>
      page.locator(
        `[data-test-subj="metricsExperienceBreakdownSelectorButton"][data-selected-value*="${dimensionName}"]`
      ),
  };
}

function createChartActions(page: ScoutPage): ChartActions {
  return {
    viewDetails: page.testSubj.locator(
      'embeddablePanelAction-ACTION_METRICS_EXPERIENCE_VIEW_DETAILS'
    ),
    copyToDashboard: page.testSubj.locator(
      'embeddablePanelAction-ACTION_METRICS_EXPERIENCE_COPY_TO_DASHBOARD'
    ),
    explore: page.testSubj.locator(
      'embeddablePanelAction-ACTION_METRICS_EXPERIENCE_EXPLORE_IN_DISCOVER_TAB'
    ),
  };
}

function createDimensionsPagination(parentContainer: Locator): DimensionsPagination {
  const container = parentContainer.locator(
    '[data-test-subj="metricsExperienceFlyoutOverviewTabDimensionsPagination"]'
  );
  return {
    container,
    prevButton: container.locator('[data-test-subj="pagination-button-previous"]'),
    nextButton: container.locator('[data-test-subj="pagination-button-next"]'),
    getPageButton: (pageIndex: number) =>
      container.locator(`[data-test-subj="pagination-button-${pageIndex}"]`),
  };
}

function createFlyout(page: ScoutPage): MetricsFlyout {
  const container = page.testSubj.locator('metricsExperienceFlyout');
  return {
    container,
    overview: {
      // TODO: Replace with page.testSubj.locator() once data-test-subj is added to tabs
      tab: page.locator('role=tab[name="Overview"]'),
      descriptionList: page.testSubj.locator('metricsExperienceFlyoutOverviewTabDescriptionList'),
      dimensionsPagination: createDimensionsPagination(container),
    },
    esqlQuery: {
      // TODO: Replace with page.testSubj.locator() once data-test-subj is added to tabs
      tab: page.locator('role=tab[name="ES|QL Query"]'),
      codeBlock: container.locator('.euiCodeBlock'),
    },
  };
}

export class MetricsExperiencePage {
  private readonly codeEditor: KibanaCodeEditorWrapper;
  public readonly container: Locator;
  public readonly grid: Locator;
  public readonly cards: Locator;
  public readonly pagination: MetricsPagination;
  public readonly flyout: MetricsFlyout;
  public readonly searchButton: Locator;
  public readonly searchInput: Locator;
  public readonly emptyState: Locator;
  public readonly chartActions: ChartActions;
  public readonly breakdownSelector: BreakdownSelector;

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
    this.flyout = createFlyout(page);
    this.chartActions = createChartActions(page);
    this.breakdownSelector = createBreakdownSelector(page);
    this.searchButton = page.testSubj.locator('metricsExperienceToolbarSearch');
    this.searchInput = page.testSubj.locator('metricsExperienceGridToolbarSearch');
    this.emptyState = page.testSubj.locator('metricsExperienceNoData');
  }

  /**
   * Runs an ES|QL query in the Discover code editor and waits for results.
   */
  public async runEsqlQuery(query: string): Promise<void> {
    await this.discover.selectTextBaseLang();
    await this.codeEditor.setCodeEditorValue(query);
    await this.page.testSubj.click('querySubmitButton');
    await this.discover.waitUntilSearchingHasFinished();
  }

  /**
   * Returns the locator for a metric card at the given index in the grid.
   */
  public getCardByIndex(index: number): Locator {
    return this.grid.locator(`[data-chart-index="${index}"]`);
  }

  /**
   * Searches for a metric by name using the toolbar search input.
   * Opens the search input if not already visible.
   */
  public async searchMetric(term: string): Promise<void> {
    const isInputVisible = await this.searchInput.isVisible();
    if (!isInputVisible) {
      await this.searchButton.click();
    }
    await this.searchInput.fill(term);
  }

  /**
   * Clears the search input to restore the full grid view.
   */
  public async clearSearch(): Promise<void> {
    await this.searchInput.clear();
  }

  public async getVisibleCardCount(): Promise<number> {
    return this.grid.locator('[data-chart-index]').count();
  }

  /**
   * Hovers over a metric card to reveal the panel header, then clicks the
   * context menu toggle button to open the chart actions menu.
   */
  public async openCardContextMenu(index: number): Promise<void> {
    const card = this.getCardByIndex(index);
    await card.hover();
    await card.locator('[data-test-subj="embeddablePanelToggleMenuIcon"]').click();
  }

  /**
   * Opens the insights flyout by triggering "View details" from the chart
   * actions menu of the given card.
   */
  public async openInsightsFlyout(cardIndex: number): Promise<void> {
    await this.openCardContextMenu(cardIndex);
    await this.chartActions.viewDetails.click();
  }
}
