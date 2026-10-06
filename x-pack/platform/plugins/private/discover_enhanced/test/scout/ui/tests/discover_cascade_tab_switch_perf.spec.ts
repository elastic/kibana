/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CDPSession } from '@kbn/scout';
import { test, tags } from '@kbn/scout';
import { testData } from '../fixtures';

const NUM_RUNS = 3;
const SETTLE_MS = 500;

interface CdpSnapshot {
  scriptDuration: number;
  layoutDuration: number;
  layoutCount: number;
  styleRecalcCount: number;
  nodeCount: number;
  heapUsedBytes: number;
}

interface TabSwitchMeasurement {
  wallClockMs: number;
  scriptDurationMs: number;
  layoutDurationMs: number;
  layoutCount: number;
  styleRecalcCount: number;
  nodeCount: number;
  heapUsedMB: number;
}

const captureMetrics = async (cdp: CDPSession): Promise<CdpSnapshot> => {
  const { metrics } = await cdp.send('Performance.getMetrics');
  const find = (name: string) => metrics.find((m) => m.name === name)?.value ?? 0;
  return {
    scriptDuration: find('ScriptDuration'),
    layoutDuration: find('LayoutDuration'),
    layoutCount: find('LayoutCount'),
    styleRecalcCount: find('RecalcStyleCount'),
    nodeCount: find('Nodes'),
    heapUsedBytes: find('JSHeapUsedSize'),
  };
};

const computeDelta = (
  before: CdpSnapshot,
  after: CdpSnapshot,
  wallClockMs: number
): TabSwitchMeasurement => ({
  wallClockMs: Math.round(wallClockMs),
  scriptDurationMs: Math.round((after.scriptDuration - before.scriptDuration) * 1000),
  layoutDurationMs: Math.round((after.layoutDuration - before.layoutDuration) * 1000),
  layoutCount: after.layoutCount - before.layoutCount,
  styleRecalcCount: after.styleRecalcCount - before.styleRecalcCount,
  nodeCount: after.nodeCount,
  heapUsedMB: Math.round((after.heapUsedBytes / (1024 * 1024)) * 10) / 10,
});

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const medianOf = (runs: TabSwitchMeasurement[]): TabSwitchMeasurement => ({
  wallClockMs: median(runs.map((r) => r.wallClockMs)),
  scriptDurationMs: median(runs.map((r) => r.scriptDurationMs)),
  layoutDurationMs: median(runs.map((r) => r.layoutDurationMs)),
  layoutCount: median(runs.map((r) => r.layoutCount)),
  styleRecalcCount: median(runs.map((r) => r.styleRecalcCount)),
  nodeCount: median(runs.map((r) => r.nodeCount)),
  heapUsedMB: median(runs.map((r) => r.heapUsedMB)),
});

test.describe(
  'Discover - Cascade Tab-Switch Performance',
  { tag: [...tags.deploymentAgnostic, ...tags.performance] },
  () => {
    let cdp: CDPSession;

    test.beforeAll(async ({ esArchiver, kbnClient, uiSettings, apiServices }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': {
          'discover.cascadeLayoutEnabled': true,
        },
      });
      await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.LOGSTASH);
      await kbnClient.importExport.load(testData.KBN_ARCHIVES.DASHBOARD_DRILLDOWNS);
      await uiSettings.set({
        defaultIndex: testData.DATA_VIEW_ID.LOGSTASH,
        'timepicker:timeDefaults': `{ "from": "${testData.LOGSTASH_DEFAULT_START_TIME}", "to": "${testData.LOGSTASH_DEFAULT_END_TIME}"}`,
      });
    });

    test.beforeEach(async ({ browserAuth, page, context }) => {
      await browserAuth.loginAsAdmin();
      cdp = await context.newCDPSession(page);
      await cdp.send('Performance.enable');
    });

    test.afterAll(async ({ kbnClient, uiSettings, apiServices }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': {
          'discover.cascadeLayoutEnabled': false,
        },
      });
      await uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
      await kbnClient.savedObjects.cleanStandardList();
    });

    test('baseline: standard grid tab vs cascade layout tab restore latency', async ({
      page,
      pageObjects,
      log,
    }) => {
      test.setTimeout(120_000);

      await test.step('set up Tab 1 with standard ES|QL query', async () => {
        await pageObjects.discover.goto();
        await pageObjects.discover.writeAndSubmitEsqlQuery('FROM logstash-* | LIMIT 1000');
        await pageObjects.discover.waitForDocTableRendered();
        log.info('Tab 1 (standard grid) ready');
      });

      await test.step('set up Tab 2 with cascade group-by query', async () => {
        await page.testSubj.click('unifiedTabs_tabsBar_newTabBtn');
        await page.testSubj.waitForSelector('unifiedTabs_selectedTabContent', {
          state: 'visible',
          timeout: 30_000,
        });
        await pageObjects.discover.waitUntilSearchingHasFinished();
        // New tab inherits ES|QL mode from Tab 1, so we set the query directly
        // via Monaco API. Scout's `writeAndSubmitEsqlQuery` calls `selectTextBaseLang()`
        // which times out when the ES|QL button is already absent.
        await page.evaluate(
          ({ query }) => {
            const monacoEnv = (window as any).MonacoEnvironment;
            monacoEnv.monaco.editor.getModels().forEach((m: any) => m.setValue(query));
          },
          {
            query:
              'FROM logstash-* | STATS count = COUNT(bytes), average = AVG(memory) BY clientip',
          }
        );
        await page.testSubj.click('querySubmitButton');
        await pageObjects.discover.waitUntilSearchingHasFinished();
        await page.testSubj.waitForSelector('data-cascade', {
          state: 'visible',
          timeout: 30_000,
        });
        log.info('Tab 2 (cascade layout) ready');
      });

      const allTabs = await page.locator('[data-test-subj^="unifiedTabs_selectTabBtn_"]').all();
      const [tab1, tab2] = allTabs;

      await test.step('warm-up: visit both tabs to ensure lazy chunks are loaded', async () => {
        await tab1.click();
        await page.testSubj.waitForSelector('docTable', { state: 'visible', timeout: 30_000 });
        await settle();
        await tab2.click();
        await page.testSubj.waitForSelector('data-cascade', {
          state: 'visible',
          timeout: 30_000,
        });
        await settle();
        log.info('Warm-up complete');
      });

      const measureSwitch = async (
        targetTab: (typeof allTabs)[number],
        readySelector: string
      ): Promise<TabSwitchMeasurement> => {
        const before = await captureMetrics(cdp);
        const start = performance.now();
        await targetTab.click();
        await page.testSubj.waitForSelector(readySelector, { state: 'visible', timeout: 30_000 });
        const elapsed = performance.now() - start;
        const after = await captureMetrics(cdp);
        await settle();
        return computeDelta(before, after, elapsed);
      };

      const standardRuns: TabSwitchMeasurement[] = [];
      const cascadeRuns: TabSwitchMeasurement[] = [];

      for (let i = 0; i < NUM_RUNS; i++) {
        await test.step(`measurement run ${i + 1}/${NUM_RUNS}`, async () => {
          const stdResult = await measureSwitch(tab1, 'docTable');
          standardRuns.push(stdResult);
          log.info(
            `  Standard run ${i + 1}: ${stdResult.wallClockMs}ms wall | ` +
              `${stdResult.scriptDurationMs}ms script | ${stdResult.layoutDurationMs}ms layout`
          );

          const cascResult = await measureSwitch(tab2, 'data-cascade');
          cascadeRuns.push(cascResult);
          log.info(
            `  Cascade  run ${i + 1}: ${cascResult.wallClockMs}ms wall | ` +
              `${cascResult.scriptDurationMs}ms script | ${cascResult.layoutDurationMs}ms layout`
          );
        });
      }

      const standardMedian = medianOf(standardRuns);
      const cascadeMedian = medianOf(cascadeRuns);

      const ratio = (a: number, b: number): number => (b !== 0 ? Math.round((a / b) * 10) / 10 : 0);

      const report = {
        timestamp: new Date().toISOString(),
        numRuns: NUM_RUNS,
        scenarios: {
          standardTabRestore: { runs: standardRuns, median: standardMedian },
          cascadeTabRestore: { runs: cascadeRuns, median: cascadeMedian },
        },
        ratio: {
          wallClockMs: ratio(cascadeMedian.wallClockMs, standardMedian.wallClockMs),
          scriptDurationMs: ratio(cascadeMedian.scriptDurationMs, standardMedian.scriptDurationMs),
          layoutDurationMs: ratio(cascadeMedian.layoutDurationMs, standardMedian.layoutDurationMs),
        },
      };

      log.info('\n=== Cascade Tab-Switch Performance Baseline ===');
      log.info(
        `Standard median: ${standardMedian.wallClockMs}ms wall | ${standardMedian.scriptDurationMs}ms script | ${standardMedian.layoutDurationMs}ms layout | ${standardMedian.nodeCount} nodes`
      );
      log.info(
        `Cascade  median: ${cascadeMedian.wallClockMs}ms wall | ${cascadeMedian.scriptDurationMs}ms script | ${cascadeMedian.layoutDurationMs}ms layout | ${cascadeMedian.nodeCount} nodes`
      );
      log.info(
        `Ratio (cascade/standard): ${report.ratio.wallClockMs}x wall | ${report.ratio.scriptDurationMs}x script | ${report.ratio.layoutDurationMs}x layout`
      );

      test.info().attach('cascade-tab-switch-perf-baseline', {
        body: JSON.stringify(report, null, 2),
        contentType: 'application/json',
      });
    });

    // Phase 2 tests below require Fix 3a (remove `key={currentTabId}` from
    // `tabs_view.tsx`) so that expanded-group state persists across tab switches.
    // Results are documented in DATA_CASCADE_PERF.md Phase 2 section.

    // test('phase 2: expanded groups -- tab restore with leaf UnifiedDataTable instances', async ({
    //   page,
    //   pageObjects,
    //   log,
    // }) => {
    //   test.setTimeout(180_000);
    //
    //   const GROUPS_TO_EXPAND = 3;
    //
    //   await test.step('set up Tab 1 with standard ES|QL query', async () => {
    //     await pageObjects.discover.goto();
    //     await pageObjects.discover.writeAndSubmitEsqlQuery('FROM logstash-* | LIMIT 1000');
    //     await pageObjects.discover.waitForDocTableRendered();
    //     log.info('Tab 1 (standard grid) ready');
    //   });
    //
    //   await test.step('set up Tab 2 with cascade layout and expanded groups', async () => {
    //     await page.testSubj.click('unifiedTabs_tabsBar_newTabBtn');
    //     await page.testSubj.waitForSelector('unifiedTabs_selectedTabContent', {
    //       state: 'visible',
    //       timeout: 30_000,
    //     });
    //     await pageObjects.discover.waitUntilSearchingHasFinished();
    //     await page.evaluate(
    //       ({ query }) => {
    //         const monacoEnv = (window as any).MonacoEnvironment;
    //         monacoEnv.monaco.editor.getModels().forEach((m: any) => m.setValue(query));
    //       },
    //       {
    //         query:
    //           'FROM logstash-* | STATS count = COUNT(bytes), average = AVG(memory) BY clientip',
    //       }
    //     );
    //     await page.testSubj.click('querySubmitButton');
    //     await pageObjects.discover.waitUntilSearchingHasFinished();
    //     await page.testSubj.waitForSelector('data-cascade', {
    //       state: 'visible',
    //       timeout: 30_000,
    //     });
    //
    //     const rootRows = await page.locator('[data-row-type="root"]').all();
    //     await rootRows[0].waitFor({ state: 'visible', timeout: 10_000 });
    //     const rowIds: string[] = [];
    //     for (let i = 0; i < Math.min(GROUPS_TO_EXPAND, rootRows.length); i++) {
    //       const id = await rootRows[i].getAttribute('id');
    //       if (id) {
    //         rowIds.push(id);
    //       }
    //     }
    //
    //     for (const rowId of rowIds) {
    //       await page.testSubj.click(`toggle-row-${rowId}-button`);
    //       await settle();
    //     }
    //
    //     await page.waitForTimeout(2000);
    //     log.info(`Tab 2 (cascade layout) ready with ${rowIds.length} groups expanded`);
    //   });
    //
    //   const allTabs = await page.locator('[data-test-subj^="unifiedTabs_selectTabBtn_"]').all();
    //   const [tab1, tab2] = allTabs;
    //
    //   await test.step('warm-up with expanded groups', async () => {
    //     await tab1.click();
    //     await page.testSubj.waitForSelector('docTable', { state: 'visible', timeout: 30_000 });
    //     await settle();
    //     await tab2.click();
    //     await page.testSubj.waitForSelector('data-cascade', {
    //       state: 'visible',
    //       timeout: 30_000,
    //     });
    //     await page.waitForTimeout(2000);
    //     log.info('Warm-up complete');
    //   });
    //
    //   const measureSwitch = async (
    //     targetTab: (typeof allTabs)[number],
    //     readySelector: string
    //   ): Promise<TabSwitchMeasurement> => {
    //     const before = await captureMetrics(cdp);
    //     const start = performance.now();
    //     await targetTab.click();
    //     await page.testSubj.waitForSelector(readySelector, { state: 'visible', timeout: 30_000 });
    //     const elapsed = performance.now() - start;
    //     const after = await captureMetrics(cdp);
    //     await settle();
    //     return computeDelta(before, after, elapsed);
    //   };
    //
    //   const standardRuns: TabSwitchMeasurement[] = [];
    //   const cascadeRuns: TabSwitchMeasurement[] = [];
    //
    //   for (let i = 0; i < NUM_RUNS; i++) {
    //     await test.step(`expanded-groups run ${i + 1}/${NUM_RUNS}`, async () => {
    //       const stdResult = await measureSwitch(tab1, 'docTable');
    //       standardRuns.push(stdResult);
    //       log.info(
    //         `  Standard run ${i + 1}: ${stdResult.wallClockMs}ms wall | ` +
    //           `${stdResult.scriptDurationMs}ms script | ${stdResult.nodeCount} nodes`
    //       );
    //
    //       const cascResult = await measureSwitch(tab2, 'data-cascade');
    //       cascadeRuns.push(cascResult);
    //       log.info(
    //         `  Cascade (expanded) run ${i + 1}: ${cascResult.wallClockMs}ms wall | ` +
    //           `${cascResult.scriptDurationMs}ms script | ${cascResult.nodeCount} nodes`
    //       );
    //     });
    //   }
    //
    //   const standardMedian = medianOf(standardRuns);
    //   const cascadeMedian = medianOf(cascadeRuns);
    //   const ratio = (a: number, b: number): number =>
    //     b !== 0 ? Math.round((a / b) * 10) / 10 : 0;
    //
    //   log.info(`\n=== Phase 2: Expanded Groups (${GROUPS_TO_EXPAND} groups) ===`);
    //   log.info(
    //     `Standard median: ${standardMedian.wallClockMs}ms wall | ` +
    //       `${standardMedian.scriptDurationMs}ms script | ${standardMedian.nodeCount} nodes`
    //   );
    //   log.info(
    //     `Cascade  median: ${cascadeMedian.wallClockMs}ms wall | ` +
    //       `${cascadeMedian.scriptDurationMs}ms script | ${cascadeMedian.nodeCount} nodes`
    //   );
    //   log.info(
    //     `Ratio: ${ratio(cascadeMedian.wallClockMs, standardMedian.wallClockMs)}x wall | ` +
    //       `${ratio(cascadeMedian.scriptDurationMs, standardMedian.scriptDurationMs)}x script`
    //   );
    //
    //   test.info().attach('cascade-expanded-groups-perf', {
    //     body: JSON.stringify(
    //       {
    //         groupsExpanded: GROUPS_TO_EXPAND,
    //         scenarios: {
    //           standardTabRestore: { runs: standardRuns, median: standardMedian },
    //           cascadeTabRestore: { runs: cascadeRuns, median: cascadeMedian },
    //         },
    //         ratio: {
    //           wallClockMs: ratio(cascadeMedian.wallClockMs, standardMedian.wallClockMs),
    //           scriptDurationMs: ratio(
    //             cascadeMedian.scriptDurationMs,
    //             standardMedian.scriptDurationMs
    //           ),
    //         },
    //       },
    //       null,
    //       2
    //     ),
    //     contentType: 'application/json',
    //   });
    // });

    // test('phase 2: CPU profile during cascade tab restore', async ({
    //   page,
    //   pageObjects,
    //   log,
    // }) => {
    //   test.setTimeout(120_000);
    //
    //   await test.step('set up tabs', async () => {
    //     await pageObjects.discover.goto();
    //     await pageObjects.discover.writeAndSubmitEsqlQuery('FROM logstash-* | LIMIT 1000');
    //     await pageObjects.discover.waitForDocTableRendered();
    //
    //     await page.testSubj.click('unifiedTabs_tabsBar_newTabBtn');
    //     await page.testSubj.waitForSelector('unifiedTabs_selectedTabContent', {
    //       state: 'visible',
    //       timeout: 30_000,
    //     });
    //     await pageObjects.discover.waitUntilSearchingHasFinished();
    //     await page.evaluate(
    //       ({ query }) => {
    //         const monacoEnv = (window as any).MonacoEnvironment;
    //         monacoEnv.monaco.editor.getModels().forEach((m: any) => m.setValue(query));
    //       },
    //       {
    //         query:
    //           'FROM logstash-* | STATS count = COUNT(bytes), average = AVG(memory) BY clientip',
    //       }
    //     );
    //     await page.testSubj.click('querySubmitButton');
    //     await pageObjects.discover.waitUntilSearchingHasFinished();
    //     await page.testSubj.waitForSelector('data-cascade', {
    //       state: 'visible',
    //       timeout: 30_000,
    //     });
    //     log.info('Tabs ready for CPU profiling');
    //   });
    //
    //   const allTabs = await page
    //     .locator('[data-test-subj^="unifiedTabs_selectTabBtn_"]')
    //     .all();
    //   const [tab1, tab2] = allTabs;
    //
    //   await test.step('warm-up', async () => {
    //     await tab1.click();
    //     await page.testSubj.waitForSelector('docTable', {
    //       state: 'visible',
    //       timeout: 30_000,
    //     });
    //     await settle();
    //     await tab2.click();
    //     await page.testSubj.waitForSelector('data-cascade', {
    //       state: 'visible',
    //       timeout: 30_000,
    //     });
    //     await settle();
    //   });
    //
    //   await test.step('switch to standard tab (pre-position)', async () => {
    //     await tab1.click();
    //     await page.testSubj.waitForSelector('docTable', {
    //       state: 'visible',
    //       timeout: 30_000,
    //     });
    //     await settle();
    //   });
    //
    //   await test.step('profile cascade tab restore', async () => {
    //     await cdp.send('Profiler.enable');
    //     await cdp.send('Profiler.start');
    //
    //     await tab2.click();
    //     await page.testSubj.waitForSelector('data-cascade', {
    //       state: 'visible',
    //       timeout: 30_000,
    //     });
    //     await settle();
    //
    //     const { profile } = await cdp.send('Profiler.stop');
    //     await cdp.send('Profiler.disable');
    //
    //     const topFunctions = extractTopFunctions(profile, 30);
    //     log.info('\n=== Top 30 Functions by Self Time (cascade tab restore) ===');
    //     for (const fn of topFunctions) {
    //       log.info(
    //         `  ${fn.selfTimeMs.toFixed(1)}ms (${fn.selfTimePct.toFixed(1)}%) | ` +
    //           `${fn.functionName} | ${fn.url}:${fn.lineNumber}`
    //       );
    //     }
    //
    //     test.info().attach('cascade-cpu-profile-summary', {
    //       body: JSON.stringify(topFunctions, null, 2),
    //       contentType: 'application/json',
    //     });
    //
    //     test.info().attach('cascade-cpu-profile-raw', {
    //       body: JSON.stringify(profile),
    //       contentType: 'application/json',
    //     });
    //   });
    // });
  }
);

// interface ProfileFunction {
//   functionName: string;
//   url: string;
//   lineNumber: number;
//   selfTimeMs: number;
//   selfTimePct: number;
//   totalHits: number;
// }
//
// const extractTopFunctions = (
//   profile: { nodes: any[]; startTime: number; endTime: number; samples?: number[] },
//   limit: number
// ): ProfileFunction[] => {
//   const { nodes, startTime, endTime, samples } = profile;
//   const totalDurationUs = endTime - startTime;
//
//   const hitCounts = new Map<number, number>();
//   for (const node of nodes) {
//     hitCounts.set(node.id, node.hitCount ?? 0);
//   }
//
//   if (samples) {
//     for (const sampleId of samples) {
//       hitCounts.set(sampleId, hitCounts.get(sampleId) ?? 0);
//     }
//   }
//
//   const sampleInterval = totalDurationUs / (samples?.length ?? 1);
//
//   const functions: ProfileFunction[] = nodes
//     .filter((node) => node.callFrame.functionName && node.callFrame.url)
//     .map((node) => {
//       const hits = hitCounts.get(node.id) ?? 0;
//       const selfTimeUs = hits * sampleInterval;
//       const selfTimeMs = selfTimeUs / 1000;
//       return {
//         functionName: node.callFrame.functionName,
//         url: node.callFrame.url.replace(/.*\//, ''),
//         lineNumber: node.callFrame.lineNumber,
//         selfTimeMs,
//         selfTimePct: totalDurationUs > 0 ? (selfTimeUs / totalDurationUs) * 100 : 0,
//         totalHits: hits,
//       };
//     })
//     .filter((f) => f.totalHits > 0)
//     .sort((a, b) => b.selfTimeMs - a.selfTimeMs)
//     .slice(0, limit);
//
//   return functions;
// };
