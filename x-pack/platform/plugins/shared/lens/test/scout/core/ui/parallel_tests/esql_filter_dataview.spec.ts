/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_METRIC_STATE_DEFAULTS } from '@kbn/lens-common';
import { KibanaCodeEditorWrapper, type KbnClient, type ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

import { applyLensInlineEditorAndWaitClosed, spaceTest, testData } from '../fixtures';

const INITIAL_ESQL_QUERY = `FROM ${testData.KIBANA_SAMPLE_DATA_LOGS_TSDB_INDEX}
  | STATS count = COUNT(*) BY \`Over time\` = TBUCKET(50), agent.keyword`;

const WILDCARD_ESQL_QUERY = `FROM ${testData.KIBANA_SAMPLE_DATA_LOGS_TSDB_INDEX}*
  | STATS count = COUNT(*) BY \`Over time\` = TBUCKET(50), agent.keyword`;

/**
 * Creates a library Lens metric bound to the flights data view so the dashboard
 * can add a second panel without navigating into the Lens editor (which unmounts
 * the dashboard and races the debounced session-storage backup of the ES|QL panel).
 */
const createFlightsLibraryLens = async (
  kbnClient: KbnClient,
  spaceId: string,
  dataViewId: string,
  title: string
): Promise<void> => {
  await kbnClient.request({
    method: 'POST',
    path: `/s/${spaceId}/api/visualizations`,
    headers: {
      'kbn-xsrf': 'true',
      'elastic-api-version': '2023-10-31',
    },
    body: {
      type: 'metric',
      title,
      description: '',
      ignore_global_filters: false,
      sampling: 1,
      data_source: { type: 'data_view_reference', ref_id: dataViewId },
      metrics: [
        {
          type: 'primary',
          operation: 'count',
          label: 'Count of records',
          empty_as_null: true,
        },
      ],
      styling: {
        primary: {
          labels: { alignment: LENS_METRIC_STATE_DEFAULTS.titlesTextAlign },
          value: { alignment: LENS_METRIC_STATE_DEFAULTS.primaryAlign, sizing: 'auto' },
        },
      },
    },
  });
};

/** Waits until the inline ES|QL editor is interactive. */
const waitForEsqlEditorReady = async (page: ScoutPage): Promise<void> => {
  await expect(page.testSubj.locator('InlineEditingESQLEditor')).toBeVisible();
  await expect(page.testSubj.locator('ESQLEditor-run-query-button')).toBeEnabled();
  await expect(page.testSubj.locator('lnsChartSwitchPopover')).toBeVisible();
};

/**
 * Waits for a *new* ES|QL panel's editor and initial suggestion/column fetch.
 *
 * The initial request uses `FROM <index> | limit 0` and can complete *after* a
 * later STATS Run, overwriting a good chart suggestion with an empty Table.
 */
const waitForNewEsqlPanelInitialized = async (page: ScoutPage): Promise<void> => {
  await waitForEsqlEditorReady(page);
  await expect(
    page.testSubj.locator('ESQLEditor-queryStats-totalDocumentsProcessed')
  ).toBeVisible();
};

const setEsqlQueryAndRun = async (page: ScoutPage, query: string): Promise<void> => {
  const codeEditor = new KibanaCodeEditorWrapper(page);
  await codeEditor.waitCodeEditorReady('InlineEditingESQLEditor');

  const runButton = page.testSubj.locator('ESQLEditor-run-query-button');
  await expect(runButton).toBeEnabled();
  await codeEditor.setCodeEditorValue(query);
  // Monaco setValue is sync; wait until the model reflects STATS before Run.
  await expect.poll(async () => codeEditor.getCodeEditorValue()).toContain('STATS');
  await runButton.click();
  const chart = page.testSubj.locator('xyVisChart');
  await expect(chart).toBeVisible();
  await chart.locator('.echChartStatus[data-ech-render-complete="true"]').waitFor({
    state: 'attached',
  });
};

spaceTest.describe(
  'Lens ES|QL filter data view selector',
  { tag: '@local-stateful-classic' },
  () => {
    let flightsLensTitle: string;

    spaceTest.beforeAll(async ({ apiServices, kbnClient, scoutSpace }) => {
      flightsLensTitle = `Flights ESQL filter ${scoutSpace.id}`;

      // Space-scoped flights data view for the library Lens panel that supplies a
      // second data view name in the filter editor (alongside the ES|QL ad-hoc view).
      const { data: flightsDataView } = await apiServices.dataViews.create({
        title: testData.DATA_VIEW_ID.FLIGHTS,
        name: testData.DATA_VIEW_ID.FLIGHTS,
        timeFieldName: 'timestamp',
        spaceId: scoutSpace.id,
      });

      await createFlightsLibraryLens(
        kbnClient,
        scoutSpace.id,
        flightsDataView.id,
        flightsLensTitle
      );

      await scoutSpace.uiSettings.set({
        'dateFormat:tz': 'UTC',
        'timepicker:timeDefaults': JSON.stringify(testData.TSDB_IN_RANGE_DATES),
      });
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('dateFormat:tz', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'dashboard add filter from ES|QL panel should not show duplicate data view names',
      async ({ page, pageObjects }) => {
        const { dashboard, filterBar, lens } = pageObjects;

        await spaceTest.step('create a new dashboard with an ES|QL panel', async () => {
          await dashboard.openNewDashboard();
          await dashboard.addNewESQLPanel();
          await waitForNewEsqlPanelInitialized(page);
        });

        await spaceTest.step('set the ESQL query and apply', async () => {
          await setEsqlQueryAndRun(page, WILDCARD_ESQL_QUERY);
        });

        await spaceTest.step('apply and close the inline editor', async () => {
          await applyLensInlineEditorAndWaitClosed({ lens });
          await dashboard.waitForRenderComplete();
        });

        await spaceTest.step('add a flights Lens panel from the library', async () => {
          // Stay on the dashboard: opening the Lens editor unmounts it and can drop the
          // debounced session-storage backup of the ES|QL panel's applied state.
          await dashboard.addLens(flightsLensTitle);
          await dashboard.waitForRenderComplete();
          await dashboard.expectPanelCount(2);
        });

        await spaceTest.step('add a filter via the filter bar', async () => {
          // Prefer the filter bar over chart-canvas clicks — canvas hits are coordinate-fragile.
          await filterBar.addFilter({ field: 'agent.keyword', operator: 'exists' });
        });

        await spaceTest.step('open the filter editor', async () => {
          await page.testSubj.locator('~filter & ~filter-key-agent.keyword').click();
          await page.testSubj.click('editFilter');
        });

        await spaceTest.step('verify data view selector has two unique names', async () => {
          await expect(page.testSubj.locator('filterIndexPatternsSelect')).toBeVisible();

          const allOptionTexts = await page.components
            .comboBox('filterIndexPatternsSelect')
            .getAllVisibleOptions();
          // ES|QL ad-hoc view + flights library panel — and no duplicated labels.
          expect(allOptionTexts).toHaveLength(2);
          expect(allOptionTexts).toHaveLength(new Set(allOptionTexts).size);
          expect(allOptionTexts).toContain(testData.DATA_VIEW_ID.FLIGHTS);
        });
      }
    );

    spaceTest(
      'filter fields should be available after changing ES|QL query source',
      async ({ page, pageObjects }) => {
        const { dashboard, lens } = pageObjects;

        await spaceTest.step('create a new dashboard with an ES|QL panel', async () => {
          await dashboard.openNewDashboard();
          await dashboard.addNewESQLPanel();
          await waitForNewEsqlPanelInitialized(page);
        });

        await spaceTest.step('set the initial ESQL query and apply', async () => {
          await setEsqlQueryAndRun(page, INITIAL_ESQL_QUERY);
        });

        await spaceTest.step('apply and close the inline editor', async () => {
          await applyLensInlineEditorAndWaitClosed({ lens });
          await dashboard.waitForRenderComplete();
        });

        await spaceTest.step('reopen the inline editor and change the query', async () => {
          await dashboard.clickPanelAction('embeddablePanelAction-editPanel');
          await waitForEsqlEditorReady(page);

          await setEsqlQueryAndRun(page, WILDCARD_ESQL_QUERY);
        });

        await spaceTest.step('apply and close the inline editor', async () => {
          await applyLensInlineEditorAndWaitClosed({ lens });
          await dashboard.waitForRenderComplete();
        });

        await spaceTest.step('open add filter and verify fields are available', async () => {
          await page.testSubj.click('addFilter');
          await expect(page.testSubj.locator('addFilterPopover')).toBeVisible();

          const fieldOptions = await page.components
            .comboBox('filterFieldSuggestionList')
            .getAllVisibleOptions();
          expect(fieldOptions.length).toBeGreaterThan(0);
        });
      }
    );
  }
);
