/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync } from 'child_process';
import { mkdir, writeFile } from 'fs/promises';
import { arch, cpus, platform, release, totalmem } from 'os';
import path from 'path';
import { performance } from 'perf_hooks';
import type { CDPSession, Page } from 'playwright';
import { REPO_ROOT } from '@kbn/repo-info';
import { Journey } from '@kbn/journeys';
import { subj } from '@kbn/test-subj-selector';

type RootMode = 'legacy' | 'concurrent';

interface BrowserMetrics {
  longTaskCount: number;
  longTaskMs: number;
  longestInteractionMs: number | null;
}

type BenchmarkWindow = Window &
  typeof globalThis & {
    discoverRootBenchmark: BrowserMetrics;
  };

interface Sample {
  pair: number;
  mode: RootMode;
  scenario: string;
  durationMs: number;
  scriptMs: number;
  taskMs: number;
  layoutMs: number;
  styleMs: number;
  heapBytes: number;
  nodes: number;
  longTaskCount: number;
  longTaskMs: number;
  longestInteractionMs: number | null;
  searchRequests: Array<{ url: string; durationMs: number }>;
}

const pairs = Number(process.env.DISCOVER_ROOT_PAIRS ?? 10);
const cpuThrottlingRate = Number(process.env.DISCOVER_ROOT_CPU ?? 1);
if (!Number.isInteger(pairs) || pairs < 1 || pairs > 100) {
  throw new Error('DISCOVER_ROOT_PAIRS must be an integer from 1 to 100');
}
if (![1, 4, 8].includes(cpuThrottlingRate)) {
  throw new Error('DISCOVER_ROOT_CPU must be 1, 4 or 8');
}

const dataViewId = '90943e30-9a47-11e8-b64d-95841ca0b247';
const timeRange = { from: '2022-10-19T00:00:00.000Z', to: '2022-10-27T00:00:00.000Z' };
const globalState = `_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:'${timeRange.from}',to:'${timeRange.to}'))`;
const discoverUrl = `/app/discover#/?${globalState}&_a=(columns:!(message,host,response),filters:!(),index:'${dataViewId}',interval:auto,query:(language:kuery,query:''),sort:!())`;
const wideColumns = [
  'timestamp',
  'message',
  'host',
  'url',
  'response',
  'bytes',
  'clientip',
  'extension',
  'machine.os',
  'geo.src',
  'agent',
  'request',
  'referer',
  'tags',
];
const samples: Sample[] = [];
let browserVersion = '';

const waitForResults = async (page: Page) => {
  await page.locator(`${subj('discoverDocTable')}[data-table-loaded="true"]`).waitFor();
  await page
    .locator(`[data-gridcell-visible-row-index="0"] ${subj('docTableExpandToggleColumn')}`)
    .waitFor();
  await page.locator(`${subj('discoverQueryTotalHits')}[data-fetch-status="loading"]`).waitFor({
    state: 'hidden',
  });
  await page.locator(subj('globalLoadingIndicator-hidden')).waitFor();
  // A loaded DOM marker can precede paint, especially with createRoot.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  );
};

const captureMetrics = async (cdp: CDPSession): Promise<Record<string, number>> => {
  const { metrics } = await cdp.send('Performance.getMetrics');
  return Object.fromEntries(metrics.map(({ name, value }) => [name, value]));
};

export const journey = new Journey({
  esArchives: ['x-pack/performance/es_archives/sample_data_logs_many_fields'],
  kbnArchives: ['x-pack/performance/kbn_archives/logs_no_map_dashboard'],
});

// Pair zero warms both paths; measured pairs alternate AB/BA to balance cache/order effects.
for (let pair = 0; pair <= pairs; pair++) {
  const modes: RootMode[] = pair % 2 === 0 ? ['legacy', 'concurrent'] : ['concurrent', 'legacy'];
  for (const mode of modes) {
    journey.step(
      `${pair === 0 ? 'Warmup' : `Pair ${pair}`} — ${mode}`,
      async ({ page, kbnUrl, log }) => {
        const browser = page.context().browser();
        if (!browser) {
          throw new Error('This benchmark requires Chromium');
        }
        browserVersion = browser.version();
        const context = await browser.newContext({
          storageState: await page.context().storageState(),
          viewport: { width: 1440, height: 900 },
          ignoreHTTPSErrors: true,
        });
        try {
          await context.addInitScript((rootMode) => {
            if (location.protocol === 'http:' || location.protocol === 'https:') {
              sessionStorage.setItem('discover:benchmark:reactRoot', rootMode);
            }
            const metrics: BrowserMetrics = {
              longTaskCount: 0,
              longTaskMs: 0,
              longestInteractionMs: null,
            };
            (window as BenchmarkWindow).discoverRootBenchmark = metrics;
            new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                metrics.longTaskCount++;
                metrics.longTaskMs += entry.duration;
              }
            }).observe({ type: 'longtask' });
            const eventOptions = { type: 'event', durationThreshold: 16 };
            new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                metrics.longestInteractionMs = Math.max(
                  metrics.longestInteractionMs ?? 0,
                  entry.duration
                );
              }
            }).observe(eventOptions);
          }, mode);
          const benchmarkPage = await context.newPage();
          benchmarkPage.setDefaultTimeout(60_000);
          const cdp = await context.newCDPSession(benchmarkPage);
          await cdp.send('Performance.enable');
          await cdp.send('Network.enable');
          await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
          await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuThrottlingRate });
          await benchmarkPage.goto('about:blank');
          let searchRequests: Sample['searchRequests'] = [];
          benchmarkPage.on('requestfinished', (request) => {
            if (!/\/internal\/(bsearch|search\/)/.test(request.url())) {
              return;
            }
            const timing = request.timing();
            if (timing.responseEnd >= timing.requestStart && timing.requestStart >= 0) {
              searchRequests.push({
                url: new URL(request.url()).pathname,
                durationMs: timing.responseEnd - timing.requestStart,
              });
            }
          });

          const measure = async (scenario: string, action: () => Promise<void>) => {
            searchRequests = [];
            await benchmarkPage.evaluate(() => {
              const metrics = (window as BenchmarkWindow).discoverRootBenchmark;
              metrics.longTaskCount = 0;
              metrics.longTaskMs = 0;
              metrics.longestInteractionMs = null;
            });
            const before = await captureMetrics(cdp);
            const started = performance.now();
            await action();
            const durationMs = performance.now() - started;
            const after = await captureMetrics(cdp);
            // CDP duration counters reset when a new document is loaded.
            const navigates = scenario === 'hard_load' || scenario === 'warm_reload';
            const duration = (metric: string) =>
              (after[metric] - (navigates ? 0 : before[metric])) * 1000;
            const browserMetrics = await benchmarkPage.evaluate(
              () => (window as BenchmarkWindow).discoverRootBenchmark
            );
            await benchmarkPage.locator(`[data-discover-react-root="${mode}"]`).waitFor();
            if (pair === 0) {
              return;
            }
            samples.push({
              pair,
              mode,
              scenario,
              durationMs,
              scriptMs: duration('ScriptDuration'),
              taskMs: duration('TaskDuration'),
              layoutMs: duration('LayoutDuration'),
              styleMs: duration('RecalcStyleDuration'),
              heapBytes: after.JSHeapUsedSize,
              nodes: after.Nodes,
              ...browserMetrics,
              searchRequests: [...searchRequests],
            });
            log.info(`${mode} ${scenario}: ${durationMs.toFixed(0)}ms`);
          };

          await measure('hard_load', async () => {
            await benchmarkPage.goto(kbnUrl.get(discoverUrl));
            await waitForResults(benchmarkPage);
          });
          await cdp.send('Network.setCacheDisabled', { cacheDisabled: false });
          // The uncached load did not populate the browser cache. Prime it before measuring.
          await benchmarkPage.reload();
          await waitForResults(benchmarkPage);
          await measure('warm_reload', async () => {
            await benchmarkPage.reload();
            await waitForResults(benchmarkPage);
          });
          await measure('refresh', async () => {
            const response = benchmarkPage.waitForResponse(
              (res) => /\/internal\/(bsearch|search\/)/.test(res.url()) && res.ok()
            );
            await benchmarkPage.locator(subj('querySubmitButton')).click();
            await response;
            await waitForResults(benchmarkPage);
          });
          await measure('wide_table', async () => {
            await benchmarkPage.evaluate((columns) => {
              window.location.hash = window.location.hash.replace(
                /columns:!\([^)]*\)/,
                `columns:!(${columns.join(',')})`
              );
            }, wideColumns);
            await benchmarkPage
              .locator(subj('dataGridHeaderCell-url'))
              .waitFor({ state: 'attached' });
            await waitForResults(benchmarkPage);
          });
          await measure('scroll', async () => {
            const grid = benchmarkPage.locator(subj('discoverDocTable')).getByRole('grid');
            await grid.hover();
            for (let scroll = 0; scroll < 10; scroll++) {
              await benchmarkPage.mouse.wheel(0, 400);
              await benchmarkPage.evaluate(
                () =>
                  new Promise<void>((resolve) =>
                    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
                  )
              );
            }
          });
          // Return to the first row outside the flyout measurement.
          await benchmarkPage.mouse.wheel(0, -10_000);
          const firstRow = benchmarkPage.locator(
            `[data-gridcell-visible-row-index="0"] ${subj('docTableExpandToggleColumn')}`
          );
          await firstRow.waitFor();
          await measure('document_flyout', async () => {
            await firstRow.click();
            await benchmarkPage.locator(subj('kbnDocViewer')).waitFor();
            await benchmarkPage.locator(subj('docViewerFlyout')).waitFor();
            await benchmarkPage.evaluate(
              () =>
                new Promise<void>((resolve) =>
                  requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
                )
            );
          });
        } finally {
          await context.close();
        }
      }
    );
  }
}

journey.step('Write comparison report', async ({ log }) => {
  const summarize = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const percentile = (fraction: number) => {
      const index = (sorted.length - 1) * fraction;
      const lower = Math.floor(index);
      return sorted[lower] + (sorted[Math.ceil(index)] - sorted[lower]) * (index - lower);
    };
    return {
      count: sorted.length,
      median: percentile(0.5),
      p25: percentile(0.25),
      p75: percentile(0.75),
      min: sorted[0],
      max: sorted[sorted.length - 1],
    };
  };
  const scenarios = [...new Set(samples.map((sample) => sample.scenario))];
  const comparisons = scenarios.map((scenario) => {
    const forMode = (mode: RootMode) =>
      samples.filter((sample) => sample.scenario === scenario && sample.mode === mode);
    const legacy = forMode('legacy');
    const concurrent = forMode('concurrent');
    const summarizeMode = (modeSamples: Sample[]) => ({
      durationMs: summarize(modeSamples.map((sample) => sample.durationMs)),
      scriptMs: summarize(modeSamples.map((sample) => sample.scriptMs)),
      taskMs: summarize(modeSamples.map((sample) => sample.taskMs)),
      layoutMs: summarize(modeSamples.map((sample) => sample.layoutMs)),
      styleMs: summarize(modeSamples.map((sample) => sample.styleMs)),
      longTaskMs: summarize(modeSamples.map((sample) => sample.longTaskMs)),
      heapBytes: summarize(modeSamples.map((sample) => sample.heapBytes)),
    });
    const comparison = {
      scenario,
      legacy: summarizeMode(legacy),
      concurrent: summarizeMode(concurrent),
      // Negative means concurrent completed sooner. Preserve paired differences, not just medians.
      pairedDurationDeltaMs: summarize(
        concurrent.map((sample, index) => sample.durationMs - legacy[index].durationMs)
      ),
    };
    log.info(
      `${scenario}: legacy ${comparison.legacy.durationMs.median.toFixed(
        0
      )}ms; concurrent ${comparison.concurrent.durationMs.median.toFixed(
        0
      )}ms; paired delta ${comparison.pairedDurationDeltaMs.median.toFixed(0)}ms`
    );
    return comparison;
  });
  const outputDir = path.resolve(REPO_ROOT, 'data/discover_react_roots');
  await mkdir(outputDir, { recursive: true });
  const reportPath = path.join(
    outputDir,
    `${new Date().toISOString().replace(/[:.]/g, '-')}-cpu-${cpuThrottlingRate}.json`
  );
  await writeFile(
    reportPath,
    JSON.stringify(
      {
        metadata: {
          createdAt: new Date().toISOString(),
          revision: execFileSync('git', ['rev-parse', 'HEAD'], {
            cwd: REPO_ROOT,
            encoding: 'utf8',
          }).trim(),
          dirty:
            execFileSync('git', ['status', '--porcelain'], {
              cwd: REPO_ROOT,
              encoding: 'utf8',
            }).trim().length > 0,
          browserVersion,
          platform: platform(),
          release: release(),
          arch: arch(),
          cpu: cpus()[0]?.model,
          memoryBytes: totalmem(),
          pairs,
          warmupPairs: 1,
          cpuThrottlingRate,
          viewport: { width: 1440, height: 900 },
          networkThrottling: 'none',
          cache: 'disabled for hard_load; enabled afterwards',
          timeRange,
          dataViewId,
          wideColumns,
          scope: 'Discover application root only; Core and other independent roots unchanged',
          interactionMetric:
            'Longest Event Timing entry >=16ms per step; null means no entry, not zero latency or INP',
        },
        comparisons,
        samples,
      },
      null,
      2
    )
  );
  log.info(`Comparison report: ${reportPath}`);
});
