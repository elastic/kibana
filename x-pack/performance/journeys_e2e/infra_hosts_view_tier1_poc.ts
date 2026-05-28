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

const POC_CONFIGS: Array<{ name: string; settings: PocSettings }> = [
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

const HOSTS_VIEW_PATH = `app/metrics/hosts?_g=(time:(from:'now-24h',to:'now'))&_a=(dateRange:(from:now-24h,to:now),filters:!(),limit:500,panelFilters:!(),preferredSchema:semconv,query:(language:kuery,query:''))`;

const waitForHostsMeasure = async (page: Page, measureName: string) => {
  await page.waitForFunction(
    (name) => performance.getEntriesByName(name, 'measure').length > 0,
    measureName,
    { timeout: TIMEOUT_MS }
  );
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
  kibanaPage: { waitForHeader: () => Promise<void> },
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
  await kibanaPage.waitForHeader();

  await waitForHostsMeasure(page, 'infra.hosts.tableReadyDuration');

  await page.locator(subj('hostsView-tabs-metrics')).click();
  await waitForHostsMeasure(page, 'infra.hosts.metricsTabReadyDuration');

  await emitHostsPerfMeasures(page, log, configName);
};

let journeyInstance = new Journey({});

for (const { name, settings } of POC_CONFIGS) {
  journeyInstance = journeyInstance.step(
    `[${name}] benchmark Hosts UI PoC toggles`,
    async ({ page, kbnUrl, kibanaPage, log }) => {
      await runConfigBenchmark(page, kbnUrl, kibanaPage, log, name, settings);
    }
  );
}

export const journey = journeyInstance;
