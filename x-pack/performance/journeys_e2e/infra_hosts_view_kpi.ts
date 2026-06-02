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

const HOSTS_VIEW_PATH = `app/metrics/hosts?_g=(time:(from:'now-15m',to:'now'))&_a=(dateRange:(from:now-15m,to:now),filters:!(),limit:500,panelFilters:!(),preferredSchema:semconv,query:(language:kuery,query:''))`;

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
    generator: generateHostsSemconvData,
    options: {
      from: new Date(Date.now() - 1000 * 60 * 10),
      to: new Date(),
      count: 1000,
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
