/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CDPSession } from '@kbn/scout';
import { test, tags } from '@kbn/scout';
import { testData } from '../fixtures';

const BENCH_RUNS = parseInt(process.env.BENCH_RUNS ?? '5', 10);
const WARMUP_RUNS = 1;
const MEASURED_RUNS = BENCH_RUNS - WARMUP_RUNS;

test.describe(
  'EUI Theme Benchmark',
  { tag: [...tags.deploymentAgnostic, ...tags.performance] },
  () => {
    let cdp: CDPSession;

    test.beforeAll(async ({ esArchiver, kbnClient, uiSettings }) => {
      await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.LOGSTASH);
      await kbnClient.importExport.load(testData.KBN_ARCHIVES.DASHBOARD_DRILLDOWNS);
      await uiSettings.set({
        defaultIndex: testData.DATA_VIEW_ID.LOGSTASH,
        'timepicker:timeDefaults': `{ "from": "${testData.LOGSTASH_DEFAULT_START_TIME}", "to": "${testData.LOGSTASH_DEFAULT_END_TIME}"}`,
      });
    });

    test.beforeEach(async ({ browserAuth, page, context }) => {
      await browserAuth.loginAsAdmin();

      // Set localStorage flag before any Kibana code runs so the CSS vars
      // prototype activates in the browser (process.env is not available at runtime)
      const useCssVars = process.env.EUI_CSS_VARS === 'true';
      if (useCssVars) {
        await page.evaluate(() => localStorage.setItem('EUI_CSS_VARS', 'true'));
        await page.reload();
        await browserAuth.loginAsAdmin();
      }

      cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
    });

    test.afterAll(async ({ kbnClient, uiSettings }) => {
      await uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await kbnClient.savedObjects.cleanStandardList();
    });

    for (const theme of ['light', 'dark'] as const) {
      test(`Scenario 1: Initial Page Load (${theme} mode)`, async ({
        page,
        pageObjects,
        perfTracker,
        uiSettings,
        log,
      }) => {
        if (theme === 'dark') {
          await uiSettings.set({ 'theme:darkMode': 'enabled' });
        }

        const runs: Array<{
          perf: {
            recalcStyleDuration: number;
            styleRecalcCount: number;
            scriptTime: number;
            layoutTime: number;
            cpuTime: number;
          };
          nav: Awaited<ReturnType<typeof perfTracker.captureNavigationTiming>>;
        }> = [];

        for (let i = 0; i < BENCH_RUNS; i++) {
          await page.gotoApp('home');
          await page.testSubj.waitForSelector('homeApp', { timeout: 20000 });
          await perfTracker.waitForJsLoad(cdp);

          const before = await perfTracker.capturePagePerformanceMetrics(cdp);

          await pageObjects.collapsibleNav.clickItem('Discover');
          await page.testSubj.waitForSelector('discoverLayoutResizableContainer', {
            timeout: 20000,
          });
          await pageObjects.discover.waitForHistogramRendered();

          const after = await perfTracker.capturePagePerformanceMetrics(cdp);
          const nav = await perfTracker.captureNavigationTiming(page);

          if (i >= WARMUP_RUNS) {
            runs.push({
              perf: {
                recalcStyleDuration:
                  (after.recalcStyleDuration ?? 0) - (before.recalcStyleDuration ?? 0),
                styleRecalcCount: (after.styleRecalcCount ?? 0) - (before.styleRecalcCount ?? 0),
                scriptTime: (after.scriptTime ?? 0) - (before.scriptTime ?? 0),
                layoutTime: (after.layoutTime ?? 0) - (before.layoutTime ?? 0),
                cpuTime: (after.cpuTime ?? 0) - (before.cpuTime ?? 0),
              },
              nav,
            });
          } else {
            log.info(`[initial-page-load-${theme}] Warmup run ${i + 1} complete`);
          }
        }

        const report = perfTracker.collectBenchmarkReport(
          `initial-page-load-${theme}`,
          runs,
          theme
        );
        log.info(
          `[initial-page-load-${theme}] Benchmark (${MEASURED_RUNS} runs): ${JSON.stringify(
            report.metrics,
            null,
            2
          )}`
        );

        if (theme === 'dark') {
          await uiSettings.set({ 'theme:darkMode': 'disabled' });
        }
      });
    }

    test('Scenario 2: Multi-App Navigation', async ({ page, pageObjects, perfTracker, log }) => {
      const runs: Array<{
        perf: {
          recalcStyleDuration: number;
          styleRecalcCount: number;
          scriptTime: number;
          layoutTime: number;
          cpuTime: number;
        };
      }> = [];

      for (let i = 0; i < BENCH_RUNS; i++) {
        await page.gotoApp('home');
        await page.testSubj.waitForSelector('homeApp', { timeout: 20000 });
        await perfTracker.waitForJsLoad(cdp);

        const before = await perfTracker.capturePagePerformanceMetrics(cdp);

        // Home -> Discover
        await pageObjects.collapsibleNav.clickItem('Discover');
        await page.testSubj.waitForSelector('discoverLayoutResizableContainer', {
          timeout: 20000,
        });
        await pageObjects.discover.waitForHistogramRendered();

        // Discover -> Dashboards
        await pageObjects.collapsibleNav.clickItem('Dashboards');
        await page.testSubj.waitForSelector('itemsInMemTable', { timeout: 20000 });

        // Dashboards -> Discover
        await pageObjects.collapsibleNav.clickItem('Discover');
        await page.testSubj.waitForSelector('discoverLayoutResizableContainer', {
          timeout: 20000,
        });
        await pageObjects.discover.waitForHistogramRendered();

        const after = await perfTracker.capturePagePerformanceMetrics(cdp);

        if (i >= WARMUP_RUNS) {
          runs.push({
            perf: {
              recalcStyleDuration:
                (after.recalcStyleDuration ?? 0) - (before.recalcStyleDuration ?? 0),
              styleRecalcCount: (after.styleRecalcCount ?? 0) - (before.styleRecalcCount ?? 0),
              scriptTime: (after.scriptTime ?? 0) - (before.scriptTime ?? 0),
              layoutTime: (after.layoutTime ?? 0) - (before.layoutTime ?? 0),
              cpuTime: (after.cpuTime ?? 0) - (before.cpuTime ?? 0),
            },
          });
        } else {
          log.info(`[multi-app-nav] Warmup run ${i + 1} complete`);
        }
      }

      const report = perfTracker.collectBenchmarkReport('multi-app-navigation', runs);
      log.info(
        `[multi-app-nav] Benchmark (${MEASURED_RUNS} runs): ${JSON.stringify(
          report.metrics,
          null,
          2
        )}`
      );
    });

    test('Scenario 3: Theme Switch', async ({
      page,
      pageObjects,
      perfTracker,
      uiSettings,
      log,
    }) => {
      const useCssVars = process.env.EUI_CSS_VARS === 'true';
      const runs: Array<{
        perf: {
          recalcStyleDuration: number;
          styleRecalcCount: number;
          scriptTime: number;
          layoutTime: number;
          cpuTime: number;
        };
      }> = [];

      for (let i = 0; i < BENCH_RUNS; i++) {
        // Start with light mode on Discover
        await page.gotoApp('discover');
        await page.testSubj.waitForSelector('discoverLayoutResizableContainer', {
          timeout: 20000,
        });
        await pageObjects.discover.waitForHistogramRendered();

        const before = await perfTracker.capturePagePerformanceMetrics(cdp);

        if (useCssVars) {
          // CSS variables approach: no reload, just flip the data-theme attribute
          await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
          // Wait one animation frame for the browser to repaint
          await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
        } else {
          // Current JS-driven approach: set via uiSettings + reload
          await uiSettings.set({ 'theme:darkMode': 'enabled' });
          await page.reload();
          await page.testSubj.waitForSelector('discoverLayoutResizableContainer', {
            timeout: 20000,
          });
          await pageObjects.discover.waitForHistogramRendered();
        }

        const after = await perfTracker.capturePagePerformanceMetrics(cdp);

        if (i >= WARMUP_RUNS) {
          runs.push({
            perf: {
              recalcStyleDuration:
                (after.recalcStyleDuration ?? 0) - (before.recalcStyleDuration ?? 0),
              styleRecalcCount: (after.styleRecalcCount ?? 0) - (before.styleRecalcCount ?? 0),
              scriptTime: (after.scriptTime ?? 0) - (before.scriptTime ?? 0),
              layoutTime: (after.layoutTime ?? 0) - (before.layoutTime ?? 0),
              cpuTime: (after.cpuTime ?? 0) - (before.cpuTime ?? 0),
            },
          });
        } else {
          log.info(`[theme-switch] Warmup run ${i + 1} complete`);
        }

        // Reset to light mode for next iteration
        if (!useCssVars) {
          await uiSettings.set({ 'theme:darkMode': 'disabled' });
        } else {
          await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
        }
      }

      const report = perfTracker.collectBenchmarkReport(
        `theme-switch-${useCssVars ? 'css-vars' : 'js-driven'}`,
        runs
      );
      log.info(
        `[theme-switch] Benchmark (${MEASURED_RUNS} runs): ${JSON.stringify(
          report.metrics,
          null,
          2
        )}`
      );
    });
  }
);
