/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import rison from '@kbn/rison';

import {
  DEFAULT_QUALITY_ISSUE_SORT_DIRECTION,
  DEFAULT_QUALITY_ISSUE_SORT_FIELD,
} from '../../../../../common/constants';
import {
  DATA_QUALITY_DETAILS_APP_PATH,
  DATA_QUALITY_URL_STATE_KEY,
  QUALITY_ISSUE_COLUMNS,
} from '../constants';
import { normalizeCellText, normalizeHeaderText, selectSearchableOption } from './table_text';

interface DetailsPageState {
  dataStream: string;
  timeRange?: { from: string; to: string; refresh?: { pause: boolean; value: number } };
  /** Opens the flyout for this field directly from the URL. */
  expandedQualityIssue?: { name: string; type: 'degraded' | 'failed' };
  /** Toggles between current and historical quality issues. */
  showCurrentQualityIssues?: boolean;
  qualityIssuesChart?: 'degraded' | 'failed';
  /** `wired` and `classic` streams offer different mitigations. */
  view?: 'wired' | 'classic';
  breakdownField?: string;
}

/** KPIs rendered in the details page overview panel. */
export type DetailsSummaryKpi = Record<
  'docsCountTotal' | 'services' | 'hosts' | 'degradedDocs' | 'failedDocs',
  string
>;

/**
 * The Data Set Quality details page (`management/data/data_quality/details`).
 *
 * Methods return state (text, counts, locators); assertions belong in the specs.
 */
export class DatasetQualityDetailsPage {
  readonly container;
  readonly title;
  readonly headerButton;
  readonly emptyPrompt;
  readonly qualityIssuesTable;
  readonly qualityIssuesTableNoData;
  readonly degradedFieldFlyout;
  readonly linkToDiscover;
  readonly flyoutCloseButton;
  readonly currentQualityIssuesToggle;
  readonly integrationActionsButton;
  readonly editFailureStoreIcon;
  readonly enableFailureStoreButton;
  readonly failureStoreModal;
  readonly failureStoreModalSaveButton;
  readonly enableFailureStoreToggle;

  constructor(private readonly page: ScoutPage) {
    this.container = page.testSubj.locator('datasetDetailsContainer');
    this.title = page.testSubj.locator('datasetQualityDetailsTitle');
    this.headerButton = page.testSubj.locator('datasetQualityDetailsHeaderButton');
    this.emptyPrompt = page.testSubj.locator('datasetQualityDetailsEmptyPrompt');
    this.qualityIssuesTable = page.testSubj.locator('datasetQualityDetailsDegradedFieldTable');
    this.qualityIssuesTableNoData = page.testSubj.locator(
      'datasetQualityDetailsDegradedTableNoData'
    );
    this.degradedFieldFlyout = page.testSubj.locator('datasetQualityDetailsDegradedFieldFlyout');
    this.linkToDiscover = page.testSubj.locator('datasetQualityDetailsLinkToDiscover');
    this.flyoutCloseButton = page.testSubj.locator('euiFlyoutCloseButton');
    // Rendered as an EuiFilterButton with `isToggle`, so it reports state through
    // `aria-pressed` rather than the `switch` role.
    this.currentQualityIssuesToggle = page.testSubj.locator(
      'datasetQualityDetailsOverviewDegradedFieldToggleSwitch'
    );
    this.integrationActionsButton = page.testSubj.locator(
      'datasetQualityDetailsIntegrationActionsButton'
    );
    this.editFailureStoreIcon = page.testSubj.locator('datasetQualityDetailsEditFailureStore');
    this.enableFailureStoreButton = page.testSubj.locator(
      'datasetQualityDetailsEnableFailureStoreButton'
    );
    this.failureStoreModal = page.testSubj.locator('editFailureStoreModal');
    this.failureStoreModalSaveButton = page.testSubj.locator('failureStoreModalSaveButton');
    this.enableFailureStoreToggle = page.testSubj.locator('enableFailureStoreToggle');
  }

  /**
   * Builds the v2 URL state.
   *
   * `expandedQualityIssue`, `showCurrentQualityIssues` and `qualityIssuesChart` are
   * siblings of `qualityIssues`, not nested inside it — `qualityIssues` is decoded
   * with `rt.exact`, which silently strips anything but its `table` key. See
   * `dataset_quality_details_url_schema_v2.ts` in `@kbn/data-quality`.
   */
  private buildUrlParams({
    dataStream,
    timeRange,
    expandedQualityIssue,
    showCurrentQualityIssues,
    qualityIssuesChart,
    view,
    breakdownField,
  }: DetailsPageState) {
    const state = {
      v: 2,
      dataStream,
      ...(timeRange ? { timeRange } : {}),
      ...(view ? { view } : {}),
      ...(breakdownField ? { breakdownField } : {}),
      ...(expandedQualityIssue ? { expandedQualityIssue } : {}),
      ...(showCurrentQualityIssues === undefined ? {} : { showCurrentQualityIssues }),
      ...(qualityIssuesChart ? { qualityIssuesChart } : {}),
      qualityIssues: {
        table: {
          page: 0,
          rowsPerPage: 10,
          sort: {
            field: DEFAULT_QUALITY_ISSUE_SORT_FIELD,
            direction: DEFAULT_QUALITY_ISSUE_SORT_DIRECTION,
          },
        },
      },
    };

    return { [DATA_QUALITY_URL_STATE_KEY]: rison.encode(state) };
  }

  /**
   * Navigates to the details page and waits for it to settle on either the details
   * panel or the empty prompt — a data stream that does not exist renders the
   * prompt instead of the container, so waiting only for the container would hang.
   */
  async goto(pageState: DetailsPageState): Promise<void> {
    await this.page.gotoApp(DATA_QUALITY_DETAILS_APP_PATH, {
      params: this.buildUrlParams(pageState),
    });
    await this.container.or(this.emptyPrompt).waitFor({ state: 'visible' });
  }

  async waitUntilTableLoaded(): Promise<void> {
    // A filter refetch on serverless can hold the table in its loading state for longer
    // than the default 10s, so give the loading class room to detach before reading rows.
    await this.page
      .locator('.euiBasicTable-loading')
      .waitFor({ state: 'detached', timeout: 30_000 });
  }

  /**
   * Reads the overview KPIs, excluding `size` — read that with {@link getSizeKpi}.
   *
   * Size is available on both deployments, but on serverless it comes from the metering
   * API, which caches for ~30s and reports 0 until it refreshes, so it has to be polled
   * across page reloads rather than read alongside the other KPIs.
   */
  async getSummaryKpis(): Promise<DetailsSummaryKpi> {
    const read = async (title: string) =>
      (
        await this.page.testSubj
          .locator(`datasetQualityDetailsSummaryKpiValue-${title}`)
          .innerText()
      ).trim();

    return {
      docsCountTotal: await read('Total count'),
      services: await read('Services'),
      hosts: await read('Hosts'),
      degradedDocs: await read('Degraded documents'),
      failedDocs: await read('Failed documents'),
    };
  }

  async getSizeKpi(): Promise<string> {
    return (
      await this.page.testSubj.locator('datasetQualityDetailsSummaryKpiValue-Size').innerText()
    ).trim();
  }

  getSummaryCard(title: 'Degraded documents' | 'Failed documents' | 'noFailureStore') {
    return this.page.testSubj.locator(`datasetQualityDetailsSummaryKpiCard-${title}`);
  }

  /**
   * Selects a summary card so its trend chart drives the page.
   *
   * The failed-docs card remounts as its details/settings finish loading (the panel swaps
   * between card instances), so a single click fired mid-load can be dropped and leave the
   * chart on its previous selection. Retry the click until the card reports itself selected
   * through `aria-pressed`, which is also the signal the URL state has flipped. A selected
   * card is disabled, so the click is skipped once it is already pressed.
   */
  async selectQualityIssueChart(issue: 'degraded' | 'failed'): Promise<void> {
    const title = issue === 'degraded' ? 'Degraded documents' : 'Failed documents';
    const card = this.getSummaryCard(title);

    await expect
      .poll(
        async () => {
          if ((await card.getAttribute('aria-pressed')) !== 'true') {
            await card.click();
          }
          return card.getAttribute('aria-pressed');
        },
        { timeout: 30_000 }
      )
      .toBe('true');
  }

  getSparkPlots() {
    return this.page.testSubj.locator('datasetQualitySparkPlot');
  }

  async getQualityIssuesTableHeaderTexts(): Promise<string[]> {
    await this.waitUntilTableLoaded();
    return (await this.qualityIssuesTable.locator('thead th, thead td').allInnerTexts()).map(
      normalizeHeaderText
    );
  }

  getQualityIssueRows() {
    return this.qualityIssuesTable.locator('tbody tr');
  }

  async parseQualityIssuesTable(): Promise<Array<Record<string, string>>> {
    await this.waitUntilTableLoaded();
    const headers = await this.getQualityIssuesTableHeaderTexts();
    const rows = await this.getQualityIssueRows().all();

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

  async getQualityIssueNames(): Promise<string[]> {
    const rows = await this.parseQualityIssuesTable();
    return rows.map((row) => row[QUALITY_ISSUE_COLUMNS.name] ?? '');
  }

  async sortQualityIssuesBy(column: string, direction: 'ascending' | 'descending'): Promise<void> {
    const header = this.qualityIssuesTable.locator('thead th', { hasText: column });

    for (let click = 0; click < 2; click++) {
      if ((await header.getAttribute('aria-sort')) === direction) {
        return;
      }
      await header.getByRole('button').click();
      await this.waitUntilTableLoaded();
    }

    if ((await header.getAttribute('aria-sort')) !== direction) {
      throw new Error(`Could not sort quality issues by "${column}" ${direction}`);
    }
  }

  /**
   * Matches the field name exactly so lookups can't straddle two rows
   * (a substring match on `test_field` would also hit `test_field_2`).
   */
  getQualityIssueRow(fieldName: string) {
    return this.getQualityIssueRows().filter({
      has: this.page.getByText(fieldName, { exact: true }),
    });
  }

  async openQualityIssueFlyout(fieldName: string): Promise<void> {
    await this.getQualityIssueRow(fieldName)
      .locator('[data-test-subj="datasetQualityDetailsQualityIssuesExpandButton"]')
      .click();
    await this.degradedFieldFlyout.waitFor({ state: 'visible' });
  }

  async closeFlyout(): Promise<void> {
    await this.flyoutCloseButton.click();
    await this.degradedFieldFlyout.waitFor({ state: 'detached' });
  }

  async waitUntilMitigationsLoaded(): Promise<void> {
    await this.page.testSubj
      .locator('datasetQualityDetailsFlyoutManualMitigationsLoading')
      .waitFor({ state: 'detached' });
  }

  getFlyoutSection(testSubj: string) {
    return this.page.testSubj.locator(testSubj);
  }

  /**
   * Chooses the histogram breakdown field, or clears it when passed `null`.
   *
   * Narrows via the search box first because the list is virtualised, then picks by the
   * `value` attribute — labels carry a screen-reader suffix and "No breakdown" has no
   * field name. Waiting on `data-is-searching` avoids clicking mid-filter.
   */
  async selectBreakdownField(field: string | null): Promise<void> {
    const selectable = this.page.testSubj.locator('unifiedHistogramBreakdownSelectorSelectable');
    const searchTerm = field ?? 'No breakdown';
    const optionValue = field ?? '__EMPTY_SELECTOR_OPTION__';

    await this.page.testSubj.click('unifiedHistogramBreakdownSelectorButton');
    await selectable.waitFor({ state: 'visible' });

    await this.page.testSubj.fill('unifiedHistogramBreakdownSelectorSelectorSearch', searchTerm);
    await this.page
      .locator(
        '[data-test-subj="unifiedHistogramBreakdownSelectorSelectable"][data-is-searching="false"]'
      )
      .waitFor({ state: 'attached' });

    await selectable.locator(`.euiSelectableListItem[value="${optionValue}"]`).click();

    // Picking an option closes the popover, which is the signal the choice landed.
    await selectable.waitFor({ state: 'detached' });
  }

  async isCurrentQualityIssuesToggleChecked(): Promise<boolean> {
    return (await this.currentQualityIssuesToggle.getAttribute('aria-pressed')) === 'true';
  }

  /**
   * Flips the current/past quality-issues toggle and waits for the new state.
   *
   * A Lens hover-action portal can sit over this control (and the open flyout can push
   * it below the fold), so a pointer click — even forced — lands on the wrong element.
   * The event is dispatched straight to the button; re-reading the pressed state before
   * dispatching again would risk a second flip, so it is dispatched once and the new
   * `aria-pressed` value is waited on instead.
   */
  async toggleCurrentQualityIssues(): Promise<void> {
    const wasPressed = await this.isCurrentQualityIssuesToggleChecked();
    await this.currentQualityIssuesToggle.dispatchEvent('click');
    await this.currentQualityIssuesToggle
      .and(this.page.locator(`[aria-pressed="${!wasPressed}"]`))
      .waitFor({ state: 'visible' });
    await this.waitUntilTableLoaded();
  }

  private async filterFor(
    buttonTestSubj: string,
    selectorTestSubj: string,
    values: string[]
  ): Promise<void> {
    const popover = this.page.testSubj.locator(`${selectorTestSubj}Options`);
    const button = this.page.testSubj.locator(buttonTestSubj);

    // Selecting an option leaves the popover open, so a re-invocation (to deselect) would
    // otherwise reuse a stale popover whose search box is still filtered from the previous
    // pass. Toggle it shut first, then reopen, so every pass starts from a clean list.
    if (await popover.isVisible()) {
      await button.click();
      await popover.waitFor({ state: 'detached' });
    }

    await button.click();
    await popover.waitFor({ state: 'visible' });

    for (const value of values) {
      await selectSearchableOption(this.page, selectorTestSubj, value);
    }
    await this.waitUntilTableLoaded();
  }

  async filterForIssueTypes(types: string[]): Promise<void> {
    await this.filterFor(
      'datasetQualityDetailsIssueTypeSelectorButton',
      'datasetQualityDetailsIssueTypeSelector',
      types
    );
  }

  async filterForFields(fields: string[]): Promise<void> {
    await this.filterFor(
      'datasetQualityDetailsFieldSelectorButton',
      'datasetQualityDetailsFieldSelector',
      fields
    );
  }

  async openIntegrationActionsMenu(): Promise<void> {
    await this.integrationActionsButton.click();
  }

  getIntegrationAction(action: 'Overview' | 'Template' | 'ViewDashboards') {
    return this.page.testSubj.locator(`datasetQualityDetailsIntegrationAction${action}`);
  }

  getIntegrationRow(field: 'integration' | 'version') {
    return this.page.testSubj.locator(`datasetQualityDetailsFieldsList-${field}`);
  }

  async openFailureStoreModal(): Promise<void> {
    await this.editFailureStoreIcon.click();
    await this.failureStoreModal.waitFor({ state: 'visible' });
  }

  async saveFailureStoreChanges(): Promise<void> {
    await this.failureStoreModalSaveButton.click();
    await this.failureStoreModal.waitFor({ state: 'detached' });
  }
}
