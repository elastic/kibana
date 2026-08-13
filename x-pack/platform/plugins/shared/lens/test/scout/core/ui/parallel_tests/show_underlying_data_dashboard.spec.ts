/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DiscoverApp, FilterBar, KibanaCodeEditorWrapper, QueryBar } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  applyLensInlineEditorAndWaitClosed,
  createLogstashLensEditorSuiteSetup,
  openInNewTabAsScoutPage,
  spaceTest,
  testData,
} from '../fixtures';

const ESQL_QUERY = 'from logs* | stats maxB = max(bytes)';

spaceTest.describe(
  'Lens show underlying data from dashboard',
  { tag: '@local-stateful-classic' },
  () => {
    const suiteSetup = createLogstashLensEditorSuiteSetup({
      loadLensArchives: true,
      skipEmptyLensOpen: true,
    });

    spaceTest.beforeAll(suiteSetup.beforeAll);

    spaceTest.beforeEach(async ({ browserAuth, context, page, pageObjects }) => {
      await suiteSetup.beforeEach({ browserAuth, context, page, pageObjects });
    });

    spaceTest.afterAll(suiteSetup.afterAll);

    spaceTest(
      'brings both dashboard context and visualization context to Discover',
      async ({ context, kbnUrl, pageObjects }) => {
        const { visualize, lens, dashboard, queryBar, filterBar } = pageObjects;

        await spaceTest.step('embed the saved XY visualization into a new dashboard', async () => {
          await visualize.goto();
          await visualize.openSavedVisualization(testData.LENS_BASIC_TITLES.XY_VIS, {
            waitFor: 'lens',
          });
          await lens.waitForVisualization(testData.XY_CHART);
          // `saveAsNew` — this is a copy of the already-saved `lnsXYvis`, so the
          // dashboard-target radios are disabled unless saving as a new object.
          await lens.save(`Embedded Visualization ${Date.now()}`, {
            addToDashboard: 'new',
            saveAsNew: true,
          });
          await dashboard.waitForRenderComplete();
          await dashboard.saveDashboard(`Open in Discover Testing ${Date.now()}`);
        });

        await spaceTest.step('set a lucene query and filter inside the Lens editor', async () => {
          await dashboard.navigateToLensEditorFromPanel();
          await queryBar.switchQueryLanguage('lucene');
          await queryBar.setQuery('host.keyword www.elastic.co');
          await queryBar.submitQuery();
          await filterBar.addFilter({ field: 'geo.src', operator: 'is', value: 'AF' });
          await expect
            .poll(() => filterBar.hasFilter({ field: 'geo.src', value: 'AF' }))
            .toBe(true);
          await lens.saveAndReturn();
          await dashboard.waitForRenderComplete();
        });

        await spaceTest.step('set a kql query and filter on the dashboard itself', async () => {
          await queryBar.switchQueryLanguage('kql');
          await queryBar.setQuery('request.keyword : "/apm"');
          await queryBar.submitQuery();
          await filterBar.addFilter({
            field: 'host.raw',
            operator: 'is',
            value: 'cdn.theacademyofperformingartsandscience.org',
          });
          await expect
            .poll(() =>
              filterBar.hasFilter({
                field: 'host.raw',
                value: 'cdn.theacademyofperformingartsandscience.org',
              })
            )
            .toBe(true);
          await dashboard.clickQuickSave();
        });

        await spaceTest.step(
          'merges both contexts into Discover once opened from the panel',
          async () => {
            // "Open in Discover" is also available in edit mode.
            await dashboard.expectExistsPanelAction(
              'embeddablePanelAction-ACTION_OPEN_IN_DISCOVER'
            );
            await dashboard.clickCancelOutOfEditMode();

            const discoverPage = await openInNewTabAsScoutPage(context, kbnUrl, () =>
              dashboard.clickPanelAction('embeddablePanelAction-ACTION_OPEN_IN_DISCOVER')
            );

            try {
              // Query bar is present even in a no-results Discover; the data grid may not be.
              await discoverPage.testSubj
                .locator('queryInput')
                .waitFor({ state: 'visible', timeout: 20_000 });
              await new DiscoverApp(discoverPage).waitUntilSearchingHasFinished();

              const discoverFilterBar = new FilterBar(discoverPage);
              const discoverQueryBar = new QueryBar(discoverPage);

              await expect
                .poll(() => discoverFilterBar.getFilterCount(), { timeout: 20_000 })
                .toBe(3);
              expect(
                await discoverFilterBar.hasFilter({
                  field: 'host.raw',
                  value: 'cdn.theacademyofperformingartsandscience.org',
                })
              ).toBe(true);
              expect(await discoverFilterBar.hasFilter({ field: 'geo.src', value: 'AF' })).toBe(
                true
              );
              expect(await discoverFilterBar.getFiltersLabel()).toContain('Lens context (lucene)');
              expect(await discoverQueryBar.getQuery()).toBe('request.keyword : "/apm"');
            } finally {
              await discoverPage.close();
            }
          }
        );
      }
    );

    // FTR skipped this scenario too (`it.skip`): saving an ES|QL panel on a dashboard and
    // reopening it currently reverts the panel to a bare `FROM logs*` query instead of the
    // full query that was applied, so the "carries the ES|QL query over" assertion below
    // never passes. This looks like a genuine product bug in ES|QL panel persistence, not
    // a test issue; verified the inline editor itself holds the correct value right up until
    // the panel is saved/reloaded.
    spaceTest.fixme(
      'brings visualization context to Discover for Lens ES|QL panels',
      async ({ context, kbnUrl, page, pageObjects }) => {
        const { dashboard, lens } = pageObjects;

        await spaceTest.step('create a dashboard with an ES|QL panel', async () => {
          await dashboard.openNewDashboard();
          await dashboard.addNewESQLPanel();
          await expect(page.testSubj.locator('InlineEditingESQLEditor')).toBeVisible();

          const codeEditor = new KibanaCodeEditorWrapper(page);
          await codeEditor.waitCodeEditorReady('InlineEditingESQLEditor');
          await codeEditor.setCodeEditorValue(ESQL_QUERY);
          await page.testSubj.click('ESQLEditor-run-query-button');
          expect(await codeEditor.getCodeEditorValue()).toBe(ESQL_QUERY);

          await applyLensInlineEditorAndWaitClosed({ lens });
          await dashboard.waitForRenderComplete();
          await dashboard.saveDashboard(`Open in Discover ES|QL Testing ${Date.now()}`);
          // "Open in Discover" is also available in edit mode (see the sibling test above),
          // so skip switching to view mode here.
        });

        await spaceTest.step('carries the ES|QL query over to Discover', async () => {
          const discoverPage = await openInNewTabAsScoutPage(context, kbnUrl, () =>
            dashboard.clickPanelAction('embeddablePanelAction-ACTION_OPEN_IN_DISCOVER')
          );

          try {
            const discover = new DiscoverApp(discoverPage);
            await expect.poll(() => discover.codeEditor.getCodeEditorValue()).toBe(ESQL_QUERY);
          } finally {
            await discoverPage.close();
          }
        });
      }
    );
  }
);
