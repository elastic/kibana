/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DiscoverApp, FilterBar, QueryBar } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  createLogstashLensEditorSuiteSetup,
  openInDiscoverAndCheck,
  openXyVisWithTermsSplit,
  spaceTest,
  testData,
} from '../fixtures';

spaceTest.describe(
  'Lens show underlying data — Discover context',
  { tag: '@local-stateful-classic' },
  () => {
    const suiteSetup = createLogstashLensEditorSuiteSetup({
      loadLensArchives: true,
      skipEmptyLensOpen: true,
    });

    spaceTest.beforeAll(suiteSetup.beforeAll);

    spaceTest.beforeEach(async ({ browserAuth, context, page, pageObjects }) => {
      await suiteSetup.beforeEach({ browserAuth, context, page, pageObjects });
      await openXyVisWithTermsSplit(pageObjects);
    });

    spaceTest.afterAll(suiteSetup.afterAll);

    spaceTest(
      'ignores the split column when Other is enabled',
      async ({ context, kbnUrl, pageObjects }) => {
        const { lens } = pageObjects;

        await lens.dimensions.openDimensionEditor(
          'lnsXY_splitDimensionPanel > lns-dimensionTrigger'
        );
        await lens.dimensions.setTermsOtherBucket(true);
        await lens.closeDimensionEditor();
        await lens.waitForVisualization(testData.XY_CHART);

        await openInDiscoverAndCheck({ context, kbnUrl }, lens, async (discoverPage) => {
          await new DiscoverApp(discoverPage).waitUntilSearchingHasFinished();
          const queryBar = new QueryBar(discoverPage);
          await expect.poll(() => queryBar.getQuery()).toBe('');
        });
      }
    );

    spaceTest(
      'merges a lucene dimension filter into the query',
      async ({ context, kbnUrl, pageObjects }) => {
        const { lens } = pageObjects;

        await lens.dimensions.openDimensionEditor(
          'lnsXY_splitDimensionPanel > lns-dimensionTrigger'
        );
        await lens.dimensions.setTermsOtherBucket(false);
        await lens.closeDimensionEditor();

        await lens.dimensions.openDimensionEditor('lnsXY_yDimensionPanel > lns-dimensionTrigger');
        await lens.workspace.enableFilter();
        await lens.workspace.setDimensionFilterLanguage('lucene');
        await lens.workspace.setFilterBy('machine.ram:*');
        await lens.closeDimensionEditor();
        await lens.waitForVisualization(testData.XY_CHART);

        await openInDiscoverAndCheck({ context, kbnUrl }, lens, async (discoverPage) => {
          await new DiscoverApp(discoverPage).waitUntilSearchingHasFinished();
          const queryBar = new QueryBar(discoverPage);
          const discoverFilterBar = new FilterBar(discoverPage);
          await expect
            .poll(() => queryBar.getQuery())
            .toBe(
              '( ( extension.raw: "png" ) OR ( extension.raw: "css" ) OR ( extension.raw: "jpg" ) )'
            );
          expect(await discoverFilterBar.getFiltersLabel()).toStrictEqual([
            'Lens context (lucene)',
          ]);
        });
      }
    );

    spaceTest(
      'extracts all filters and columns from a formula',
      async ({ context, kbnUrl, page, pageObjects }) => {
        const { lens } = pageObjects;

        await lens.workspace.removeDimension('lnsXY_yDimensionPanel');
        await expect
          .poll(() => lens.dimensions.getDimensionTriggersTexts('lnsXY_yDimensionPanel'))
          .toStrictEqual([]);
        await lens.configureDimension({
          dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
          operation: 'formula',
          formula: 'average(memory, kql=',
          keepOpen: true,
        });
        // Lens auto-inserts the closing quote/paren and leaves the cursor inside it.
        await lens.typeInFormula('bytes > 2000', { focus: false });
        await page.keyboard.press('ArrowRight');
        await lens.closeDimensionEditor();
        // Replacing the metric can reset terms `otherBucket` to the product default (on),
        // which omits the split from Discover. Turn it off after the formula is in place
        // (FTR inherited Other-off from the previous test after the y-dimension already existed).
        await lens.dimensions.openDimensionEditor(
          'lnsXY_splitDimensionPanel > lns-dimensionTrigger'
        );
        await lens.dimensions.setTermsOtherBucket(false);
        await lens.closeDimensionEditor();
        await lens.waitForVisualization(testData.XY_CHART);

        await openInDiscoverAndCheck({ context, kbnUrl }, lens, async (discoverPage) => {
          const discover = new DiscoverApp(discoverPage);
          await discover.waitUntilSearchingHasFinished();
          const queryBar = new QueryBar(discoverPage);
          // justified: column headers can lag the query-finished signal by one paint
          await expect
            .poll(() => discover.getDocHeader(), { timeout: 20_000 })
            .toStrictEqual(['@timestamp', 'extension.raw', 'memory']);
          expect(await queryBar.getQuery()).toBe(
            '( ( bytes > 2000 ) AND ( ( extension.raw: "css" ) OR ( extension.raw: "gif" ) OR ( extension.raw: "jpg" ) ) )'
          );
        });
      }
    );

    spaceTest(
      'extracts a filter from a formula global filter',
      async ({ context, kbnUrl, pageObjects }) => {
        const { lens } = pageObjects;

        await lens.workspace.removeDimension('lnsXY_yDimensionPanel');
        await expect
          .poll(() => lens.dimensions.getDimensionTriggersTexts('lnsXY_yDimensionPanel'))
          .toStrictEqual([]);
        await lens.configureDimension({
          dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
          operation: 'formula',
          formula: 'count()',
          keepOpen: true,
        });
        await lens.workspace.enableFilter();
        const renderCountBefore = await lens.workspace.getVisualizationRenderCount(
          testData.XY_CHART
        );
        await lens.workspace.setFilterBy('bytes > 4000');
        await lens.closeDimensionEditor();
        await lens.waitForVisualization(testData.XY_CHART, {
          afterCount: renderCountBefore ?? undefined,
        });
        // Same as the formula-columns test: turn Other off after the metric exists so
        // Discover receives the split terms as well as the formula filter.
        await lens.dimensions.openDimensionEditor(
          'lnsXY_splitDimensionPanel > lns-dimensionTrigger'
        );
        await lens.dimensions.setTermsOtherBucket(false);
        await lens.closeDimensionEditor();
        await lens.waitForVisualization(testData.XY_CHART);

        await openInDiscoverAndCheck({ context, kbnUrl }, lens, async (discoverPage) => {
          await new DiscoverApp(discoverPage).waitUntilSearchingHasFinished();
          const queryBar = new QueryBar(discoverPage);
          await expect
            .poll(() => queryBar.getQuery())
            .toBe(
              '( ( bytes > 4000 ) AND ( ( extension.raw: "css" ) OR ( extension.raw: "gif" ) OR ( extension.raw: "jpg" ) ) )'
            );
        });
      }
    );
  }
);
