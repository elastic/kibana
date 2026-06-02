/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Regression gate for the Hosts UI KPI render path.
//
// The four KPI tiles (CPU, Normalized Load, Memory, Disk) are served by a
// single client-side ES|QL `STATS` query (over the data plugin) that fires
// in parallel with the `/host` table fetch (both gated on
// `useHostsPageReady`). This journey self-seeds a semconv (OTel host
// metrics) fleet, loads the Hosts page cold, and reads the `infra.hosts.*`
// User Timing measures emitted by the page hooks (see
// `pages/metrics/hosts/utils/perf_marks.ts`) to capture table- vs
// KPI-readiness as distinct, parallel signals.
//
// Benchmark fidelity: mirrors the Hosts UI PoC harness
// (`infra_hosts_view_tier1_poc.ts` / `hosts_semconv_tsds` scenario) so KPI
// numbers are directly comparable — 1500 semconv hosts over a 24 h window on
// a production-shaped TSDS OTel data stream, with both the `_g` time picker
// and `_a.dateRange` set to `now-24h` → `now`. A 5 m sampling interval keeps
// the seed at ~432k docs (vs ~4.3M at 30s) while preserving the same fleet
// cardinality and time window — anything denser is re-aggregated by the
// query layer at this range anyway.
//
// Complements `infra_hosts_view_semconv.ts` (which gates the KPI *grid*
// render via `waitForCharts`); this journey gates the finer-grained
// `tableReadyDuration` / `kpiReadyDuration` User Timing measures specific to
// the parallel-fetch architecture.

import type { Page } from 'playwright';
import type { ToolingLog } from '@kbn/tooling-log';
import { Journey } from '@kbn/journeys';
import { subj } from '@kbn/test-subj-selector';
import { generateHostsSemconvData } from '../synthtrace_data/hosts_semconv_data';

const TIMEOUT_MS = 120_000;

// 24 h seed window matching the PoC benchmark. `LOOK_BACK_TIME` widens the
// TSDS acceptance window (window + 1 h buffer) so the backdated `now-24h`
// seed range ingests without rejection.
const SEED_WINDOW_MS = 1000 * 60 * 60 * 24;
const SEED_FROM = new Date(Date.now() - SEED_WINDOW_MS);
const SEED_TO = new Date();
const LOOK_BACK_TIME = '25h';
const HOST_COUNT = 1500;

const HOSTS_VIEW_PATH = `app/metrics/hosts?_g=(time:(from:'now-24h',to:'now'))&_a=(dateRange:(from:now-24h,to:now),filters:!(),limit:500,panelFilters:!(),preferredSchema:semconv,query:(language:kuery,query:''))`;

interface WaitOpts {
  timeoutMs?: number;
  throwOnTimeout?: boolean;
}

const waitForHostsMeasure = async (
  page: Page,
  log: ToolingLog,
  measureName: string,
  { timeoutMs = TIMEOUT_MS, throwOnTimeout = true }: WaitOpts = {}
) => {
  try {
    await page.waitForFunction(
      (name) => performance.getEntriesByName(name, 'measure').length > 0,
      measureName,
      { timeout: timeoutMs }
    );
    return true;
  } catch (err) {
    // On timeout, surface what marks/measures the page actually has so we
    // can tell whether the page reached `navigationStart` at all, vs. the
    // data fetch being in-flight.
    const snapshot = await page.evaluate(() => ({
      url: window.location.href,
      readyState: document.readyState,
      marks: performance.getEntriesByType('mark').map((m) => m.name),
      measures: performance
        .getEntriesByType('measure')
        .map(({ name, duration }) => ({ name, duration })),
    }));
    log.error(
      `[journey-diag] waiting for ${measureName} timed out. page snapshot: ${JSON.stringify(
        snapshot
      )}`
    );
    if (throwOnTimeout) throw err;
    return false;
  }
};

const emitHostsPerfMeasures = async (page: Page, log: ToolingLog) => {
  const snapshot = await page.evaluate(() => ({
    marks: performance.getEntriesByType('mark').map((m) => m.name),
    measures: performance
      .getEntriesByType('measure')
      .filter((m) => m.name.startsWith('infra.hosts.'))
      .map(({ name, duration }) => ({ name, duration })),
  }));

  log.info(
    `[journey-snapshot] marks=${JSON.stringify(
      snapshot.marks.filter((n) => n.startsWith('infra.hosts.'))
    )}`
  );

  for (const { name, duration } of snapshot.measures) {
    const line = `[journey-metric] name=${name} duration_ms=${duration}`;
    // eslint-disable-next-line no-console
    console.log(line);
    log.info(line);
  }
};

export const journey = new Journey({
  synthtrace: {
    type: 'infra',
    // Seed onto a production-shaped TSDS OTel data stream (the default
    // journey path is plain data streams) so the KPI ES|QL `STATS` runs on
    // the same `index.mode: time_series` code path the Hosts UI exercises in
    // production — matching the PoC benchmark.
    setupClient: (client) => {
      if ('setOtelDataStreamTemplateOptions' in client) {
        client.setOtelDataStreamTemplateOptions({ tsds: true, lookBackTime: LOOK_BACK_TIME });
      }
    },
    generator: generateHostsSemconvData,
    options: {
      from: SEED_FROM,
      to: SEED_TO,
      count: HOST_COUNT,
      interval: '5m',
    },
  },
}).step('Load Hosts view and measure KPI readiness', async ({ page, kbnUrl, log }) => {
  // Clear any marks from a previous navigation so the measures are anchored
  // to this page load.
  await page.addInitScript(() => {
    if (typeof performance !== 'undefined') {
      performance.clearMarks();
      performance.clearMeasures();
    }
  });

  await page.goto(kbnUrl.get(HOSTS_VIEW_PATH), { timeout: TIMEOUT_MS });
  // `KibanaPage.waitForHeader` waits on the `.headerGlobalNav` class which
  // only exists on the classic chrome variant. The project chrome variant
  // (used by FTR's Kibana on stateful) only emits the data-test-subj.
  await page.waitForSelector(subj('headerGlobalNav'), {
    state: 'attached',
    timeout: TIMEOUT_MS,
  });

  await waitForHostsMeasure(page, log, 'infra.hosts.tableReadyDuration');
  await waitForHostsMeasure(page, log, 'infra.hosts.kpiReadyDuration');

  await emitHostsPerfMeasures(page, log);
});
