/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import rison from '@kbn/rison';

import { DATA_QUALITY_APP_PATH, DATA_QUALITY_URL_STATE_KEY, TABLE_COLUMNS } from '../constants';
import { normalizeCellText, normalizeHeaderText, selectOptionByText } from './table_text';

interface ListPageState {
  v?: number;
  table?: { page?: number; sort?: { field: string; direction: string } };
  filters?: Record<string, unknown>;
}

/** Health KPIs rendered in the summary panel above the table. */
export type SummaryPanelKpi = Record<
  'datasetHealthPoor' | 'datasetHealthDegraded' | 'datasetHealthGood' | 'activeDatasets',
  string
>;

/**
 * The Data Set Quality list page (`management/data/data_quality`).
 *
 * Methods return state (text, counts, locators); assertions belong in the specs.
 */
export class DatasetQualityPage {
  readonly table;
  readonly searchInput;
  readonly noDataEmptyState;
  readonly noPrivilegesEmptyState;
  readonly showFullDatasetNamesSwitch;
  readonly showInactiveDatasetsSwitch;

  constructor(private readonly page: ScoutPage) {
    this.table = page.testSubj.locator('datasetQualityTable');
    this.searchInput = page.testSubj.locator('datasetQualityFilterBarFieldSearch');
    // EUI renders `noItemsMessage` both in the visible empty row and in the table's
    // screen-reader-only <caption>, so the prompt's test subject matches twice. Scope to
    // the row: it is the copy a user sees, and the caption copy is a 1px offscreen element
    // that would satisfy a visibility assertion on its own.
    this.noDataEmptyState = this.table.locator(
      'tbody [data-test-subj="datasetQualityTableNoData"]'
    );
    this.noPrivilegesEmptyState = page.testSubj.locator('datasetQualityNoPrivilegesEmptyState');
    // These switches expose no dedicated test subject, so they are matched by the
    // accessible name EUI renders from their aria-label.
    this.showFullDatasetNamesSwitch = page.getByRole('switch', {
      name: 'Show full data set names',
    });
    this.showInactiveDatasetsSwitch = page.getByRole('switch', {
      name: 'Show inactive data sets',
    });
  }

  private buildUrlParams(pageState: ListPageState = {}) {
    const state = { v: 1, table: { page: 0 }, filters: {}, ...pageState };
    return { [DATA_QUALITY_URL_STATE_KEY]: rison.encode(state) };
  }

  async goto(pageState: ListPageState = {}): Promise<void> {
    await this.page.gotoApp(DATA_QUALITY_APP_PATH, { params: this.buildUrlParams(pageState) });
    await this.waitUntilTableLoaded();
  }

  /**
   * Waits for the table to finish loading. No test subject reflects the loading state,
   * so this waits for the wrapper's loading class to clear and, as a belt-and-braces
   * guard, for no cell to still show `EuiSkeletonRectangle` markup — Size, Quality, the
   * doc percentages and Last activity each render one while their stats are in flight.
   */
  async waitUntilTableLoaded(): Promise<void> {
    await this.table.waitFor({ state: 'visible' });
    // The table stays in its loading state until the stats request resolves, which for a
    // privilege-scoped user on a busy cluster can take longer than the default 10s.
    await this.page
      .locator('.euiBasicTable-loading')
      .waitFor({ state: 'detached', timeout: 30_000 });
    await expect(this.table.locator('.euiSkeletonRectangle')).toHaveCount(0);
  }

  /**
   * Waits for the summary panel KPIs to hold settled values.
   *
   * The tiles only skeleton while the stats and degraded-docs requests are in flight, but
   * their values also derive from the total-docs and integrations requests and render as
   * zeroes before any request starts — right after a reload the skeletons are not even in
   * the DOM yet, so waiting on them alone can sample a pre-fetch zero. The table's loading
   * state covers every request the KPIs read from, so wait for that first.
   */
  async waitUntilSummaryPanelLoaded(): Promise<void> {
    await this.waitUntilTableLoaded();

    for (const kpi of ['Active Data Sets', 'Estimated Data']) {
      await this.page.testSubj
        .locator(`datasetQuality-${kpi}-loading`)
        .waitFor({ state: 'detached' });
    }
  }

  /**
   * Reads the summary panel KPIs, excluding `estimatedData` — read that with
   * {@link getEstimatedDataKpi}.
   *
   * Estimated data is available on both deployments, but on serverless it derives from
   * the metering API, which caches for ~30s and reports 0 until it refreshes, so it has
   * to be polled across page reloads rather than read alongside the counters.
   */
  async getSummaryPanelKpis(): Promise<SummaryPanelKpi> {
    await this.waitUntilSummaryPanelLoaded();

    const read = async (title: string) =>
      (
        await this.page.testSubj.locator(`datasetQualityDatasetHealthKpi-${title}`).innerText()
      ).trim();

    return {
      datasetHealthPoor: await read('Poor'),
      datasetHealthDegraded: await read('Degraded'),
      datasetHealthGood: await read('Good'),
      activeDatasets: await read('Active Data Sets'),
    };
  }

  async getEstimatedDataKpi(): Promise<string> {
    await this.waitUntilSummaryPanelLoaded();
    return (
      await this.page.testSubj.locator('datasetQualityDatasetHealthKpi-Estimated Data').innerText()
    ).trim();
  }

  async getTableHeaderTexts(): Promise<string[]> {
    await this.waitUntilTableLoaded();
    return (await this.table.locator('thead th, thead td').allInnerTexts()).map(
      normalizeHeaderText
    );
  }

  getRows() {
    return this.table.locator('tbody tr');
  }

  /**
   * Reads the table as a list of column-name keyed records, so assertions can
   * name the column they care about instead of tracking cell indexes.
   */
  async parseTable(): Promise<Array<Record<string, string>>> {
    await this.waitUntilTableLoaded();
    const headers = await this.getTableHeaderTexts();
    const rows = await this.getRows().all();

    return Promise.all(
      rows.map(async (row) => {
        const cells = await row.locator('td').allInnerTexts();
        return headers.reduce<Record<string, string>>((record, header, index) => {
          record[header] = normalizeCellText(cells[index] ?? '');
          return record;
        }, {});
      })
    );
  }

  async getColumnValues(column: string): Promise<string[]> {
    const rows = await this.parseTable();
    return rows.map((row) => row[column] ?? '');
  }

  async getDatasetNames(): Promise<string[]> {
    return this.getColumnValues(TABLE_COLUMNS.name);
  }

  /**
   * An EUI sort header cycles none -> ascending -> descending, so any direction is at
   * most two clicks away. State is re-read between clicks so a dead header fails rather
   * than silently retrying.
   */
  async sortBy(column: string, direction: 'ascending' | 'descending'): Promise<void> {
    const header = this.table.locator('thead th', { hasText: column });

    for (let click = 0; click < 2; click++) {
      if ((await header.getAttribute('aria-sort')) === direction) {
        return;
      }
      await header.getByRole('button').click();
      await this.waitUntilTableLoaded();
    }

    if ((await header.getAttribute('aria-sort')) !== direction) {
      throw new Error(`Could not sort column "${column}" ${direction}`);
    }
  }

  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.waitUntilTableLoaded();
  }

  async clearSearch(): Promise<void> {
    await this.searchInput.clear();
    await this.waitUntilTableLoaded();
  }

  async toggleShowFullDatasetNames(): Promise<void> {
    await this.showFullDatasetNamesSwitch.click();
    await this.waitUntilTableLoaded();
  }

  async toggleShowInactiveDatasets(): Promise<void> {
    await this.showInactiveDatasetsSwitch.click();
    await this.waitUntilTableLoaded();
  }

  private async filterFor(
    buttonTestSubj: string,
    containerTestSubj: string,
    values: string[]
  ): Promise<void> {
    const popover = this.page.testSubj.locator(containerTestSubj);
    const button = this.page.testSubj.locator(buttonTestSubj);

    // Selecting an option leaves the popover open, so a re-invocation (to deselect) would
    // otherwise reuse a stale popover. Toggle it shut first, then reopen, so every pass
    // starts from a freshly rendered list.
    if (await popover.isVisible()) {
      await button.click();
      await popover.waitFor({ state: 'detached' });
    }

    await button.click();
    await popover.waitFor({ state: 'visible' });

    for (const value of values) {
      await selectOptionByText(this.page, containerTestSubj, value);
    }
    await this.waitUntilTableLoaded();
  }

  async filterForIntegrations(integrations: string[]): Promise<void> {
    await this.filterFor(
      'datasetQualityIntegrationsSelectableButton',
      'datasetQualityIntegrationsSelectable',
      integrations
    );
  }

  async filterForNamespaces(namespaces: string[]): Promise<void> {
    await this.filterFor(
      'datasetQualityNamespacesSelectableButton',
      'datasetQualityNamespacesSelectable',
      namespaces
    );
  }

  async filterForQualities(qualities: string[]): Promise<void> {
    await this.filterFor(
      'datasetQualityQualitiesSelectableButton',
      'datasetQualityQualitiesSelectable',
      qualities
    );
  }

  getTypesFilter() {
    return this.page.testSubj.locator('datasetQualityFilterTypeSelectableButton');
  }

  getInsufficientPrivilegesBadge(dataset: string) {
    return this.page.testSubj.locator(`datasetQualityInsufficientPrivileges-${dataset}`);
  }

  /**
   * Matches the dataset name exactly so lookups can't straddle two rows
   * (a substring match on `synth.1` would also hit `synth.10`).
   */
  getRowByDataset(dataset: string) {
    return this.getRows().filter({ has: this.page.getByText(dataset, { exact: true }) });
  }

  /** Takes the full data stream name (e.g. `logs-synth.1-default`), not the data set. */
  getSetFailureStoreLink(dataStream: string) {
    return this.page.testSubj.locator(`datasetQualitySetFailureStoreLink-${dataStream}`);
  }

  /** Takes the full data stream name, not the data set. */
  getDetailsLink(dataStream: string) {
    return this.page.testSubj.locator(`datasetQualityTableDetailsLink-${dataStream}`);
  }

  /** Scoped to the row: each row also renders a details link that would otherwise match. */
  getOpenInDiscoverLink(dataset: string) {
    return this.getRowByDataset(dataset).locator(
      '[data-test-subj="datasetQualityLogsExplorerLinkLink"]'
    );
  }
}
