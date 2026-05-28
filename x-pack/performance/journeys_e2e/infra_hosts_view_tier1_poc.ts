/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Expected seed:
//   node scripts/synthtrace hosts_semconv_tsds.ts \
//     --target=http://elastic:pw@localhost:9200 \
//     --from=now-24h --to=now --scenarioOpts=hosts=1500
//
// Time range: global `_g` time picker and Hosts `_a.dateRange` both use `now-24h` → `now`
// to match the 1500-host × 24 h seed window. Schema: semconv (OTel host metrics).

import type { Page } from 'playwright';
import type { ToolingLog } from '@kbn/tooling-log';
import { Journey } from '@kbn/journeys';
import { subj } from '@kbn/test-subj-selector';

const TIMEOUT_MS = 120_000;
const POC_SETTINGS_STORAGE_KEY = 'kibana.observability.hosts.poc_settings';

// Mirrors `PocSettings` in use_poc_settings.ts — keep keys aligned with the PoC popover.
// Every flag follows the convention "OFF = main behaviour, ON = PoC
// optimisation engaged", so `ALL_OFF` is the unmodified main render path.
interface PocSettings {
  useLensEsqlMetricsCharts: boolean;
  useLensEsqlKpiCharts: boolean;
  useEsqlEndpointKpi: boolean;
  dropKpiTrendline: boolean;
  useTermsFilter: boolean;
  useConsolidatedKql: boolean;
  useStrippedBoolWrap: boolean;
}

const ALL_OFF: PocSettings = {
  useLensEsqlMetricsCharts: false,
  useLensEsqlKpiCharts: false,
  useEsqlEndpointKpi: false,
  dropKpiTrendline: false,
  useTermsFilter: false,
  useConsolidatedKql: false,
  useStrippedBoolWrap: false,
};

const ALL_POC_CONFIGS: Array<{ name: string; settings: PocSettings }> = [
  // `baseline-main` is the unmodified main path — Lens DSL KPI tiles WITH
  // trendline, all Tier-1 fixes off. Every other config is reported as a
  // delta against this row.
  { name: 'baseline-main', settings: ALL_OFF },
  {
    name: 'tier1',
    settings: {
      ...ALL_OFF,
      useTermsFilter: true,
      useConsolidatedKql: true,
      useStrippedBoolWrap: true,
    },
  },
  {
    name: 'p15a',
    settings: {
      ...ALL_OFF,
      dropKpiTrendline: true,
    },
  },
  {
    name: 'p15c',
    settings: {
      ...ALL_OFF,
      useLensEsqlKpiCharts: true,
      // The ES|QL Lens path is hardcoded to no trendline, so this is
      // mostly redundant — kept explicit so the row reads at a glance
      // as "Lens ES|QL KPIs, no trendline".
      dropKpiTrendline: true,
    },
  },
  {
    name: 'p15b',
    settings: {
      ...ALL_OFF,
      useEsqlEndpointKpi: true,
    },
  },
  {
    name: 'p16-a',
    settings: {
      ...ALL_OFF,
      useLensEsqlMetricsCharts: true,
    },
  },
  {
    name: 'everything',
    settings: {
      useLensEsqlMetricsCharts: true,
      useLensEsqlKpiCharts: true,
      useEsqlEndpointKpi: true,
      dropKpiTrendline: true,
      useTermsFilter: true,
      useConsolidatedKql: true,
      useStrippedBoolWrap: true,
    },
  },
];

// `JOURNEY_CONFIG_FILTER` filters the matrix to a comma-separated list of
// config names. Useful for smoke runs (`JOURNEY_CONFIG_FILTER=everything`)
// or iterating on a single shape. Unset = run all configs.
const CONFIG_FILTER = process.env.JOURNEY_CONFIG_FILTER?.split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const POC_CONFIGS = CONFIG_FILTER?.length
  ? ALL_POC_CONFIGS.filter((c) => CONFIG_FILTER.includes(c.name))
  : ALL_POC_CONFIGS;

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
    // table data fetch is in-flight, vs. addInitScript wiped marks too
    // late, etc.
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

const emitHostsPerfMeasures = async (page: Page, log: ToolingLog, configName: string) => {
  const measures = await page.evaluate(() =>
    performance
      .getEntriesByType('measure')
      .filter((m) => m.name.startsWith('infra.hosts.'))
      .map(({ name, duration }) => ({ name, duration }))
  );

  for (const { name, duration } of measures) {
    const line = `[journey-metric] config=${configName} name=${name} duration_ms=${duration}`;
    // eslint-disable-next-line no-console
    console.log(line);
    log.info(line);
  }
};

const runConfigBenchmark = async (
  page: Page,
  kbnUrl: { get: (path: string) => string },
  log: ToolingLog,
  configName: string,
  settings: PocSettings
) => {
  await page.addInitScript(
    ([storageKey, pocSettings]) => {
      if (typeof performance !== 'undefined') {
        performance.clearMarks();
        performance.clearMeasures();
      }
      localStorage.setItem(storageKey, JSON.stringify(pocSettings));
    },
    [POC_SETTINGS_STORAGE_KEY, settings] as const
  );

  await page.goto(kbnUrl.get(HOSTS_VIEW_PATH), { timeout: TIMEOUT_MS });
  // `KibanaPage.waitForHeader` waits on the `.headerGlobalNav` class which
  // only exists on the classic chrome variant. The project chrome variant
  // (used by FTR's Kibana on stateful) only emits the data-test-subj. Use
  // that directly so the journey works against both variants.
  await page.waitForSelector(subj('headerGlobalNav'), {
    state: 'attached',
    timeout: TIMEOUT_MS,
  });

  await waitForHostsMeasure(page, log, 'infra.hosts.tableReadyDuration');

  // Metrics-tab readiness is best-effort: the mark fires only once *every*
  // Lens chart in the grid calls `onLoad(false)`. A single embeddable
  // getting stuck (or `onLoad` firing in an order we don't expect) will
  // prevent it from ever resolving, so we cap the wait and continue with
  // whatever measures the page already has rather than failing the run.
  await page.locator(subj('hostsView-tabs-metrics')).click();
  await waitForHostsMeasure(page, log, 'infra.hosts.metricsTabReadyDuration', {
    timeoutMs: 45_000,
    throwOnTimeout: false,
  });

  await emitHostsPerfMeasures(page, log, configName);
};

let journeyInstance = new Journey({});

for (const { name, settings } of POC_CONFIGS) {
  journeyInstance = journeyInstance.step(
    `[${name}] benchmark Hosts UI PoC toggles`,
    async ({ page, kbnUrl, log }) => {
      await runConfigBenchmark(page, kbnUrl, log, name, settings);
    }
  );
}

export const journey = journeyInstance;
