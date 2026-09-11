/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync, statSync } from 'fs';

import { apiTest, AUDIT_LOG_PATH, tags } from '@kbn/scout';
import type { ApiClientFixture, SamlAuth } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

/**
 * Saved object audit diff performance measurements.
 *
 * Runs identical write workloads through the public saved objects API and samples
 * Kibana's own process metrics (`/api/stats?extended=true`) around each one. Run it
 * once against a server with `xpack.security.audit.savedObjectDiff.enabled: true` and
 * once against the baseline (feature off), then compare the attached results. It is a
 * measurement suite, not a regression gate: the only assertions are that the writes
 * succeed and Kibana stays available. See ../../README.md.
 */

// Allow-listed on the `security_audit_so_diff_perf` config set and the Cloud plan in the README.
const TYPE = 'index-pattern';
const DASHBOARD_TYPE = 'dashboard';
const KBN_HEADERS = { 'kbn-xsrf': 'x', 'x-elastic-internal-origin': 'kibana' };
// Free-form label for the run (e.g. "diffs-on", "diffs-off-1gb-ech"); stored in the results.
const RUN_LABEL = process.env.SO_DIFF_PERF_LABEL ?? 'unlabeled';

// ~110 bytes per panel serialized; keep every request under Cloud's default 1 MB server.maxPayload.
const PANELS_PER_LEAF_BLOCK = 200; // ≈1k leaves
const BIG_OBJECT_PANELS = 2000; // ≈10k leaves, ≈220 KB
const SEQUENTIAL_BULK_CREATE = { batches: 5, objectsPerBatch: 3, panels: BIG_OBJECT_PANELS };
const SINGLE_UPDATES = 40;
const BULK_UPDATE = { rounds: 5, objects: 20, panels: 2 * PANELS_PER_LEAF_BLOCK };
const IMPORT = { passes: 2, objects: 30, panels: PANELS_PER_LEAF_BLOCK };
const CONCURRENT = { rounds: 3, parallel: 8, objectsPerBatch: 6, panels: 1000 };

// Dashboard workload: 60 Lens panels ≈ 49 KB panelsJSON string. Each title-only update
// replaces the entire panelsJSON string in the diff (single large field, not nested leaves).
const DASHBOARD_PANELS = 60;
const DASHBOARD_UPDATES = 20;

interface ProcessSample {
  eventLoopDelayMaxMs: number;
  eventLoopDelayP99Ms: number;
  eventLoopUtilization: number;
  heapUsedBytes: number;
  heapSizeLimitBytes: number;
  rssBytes: number;
}

interface WorkloadResult {
  label: string;
  workload: string;
  requests: number;
  wallMs: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  latencyMaxMs: number;
  eventLoopDelayMaxMs: number;
  eventLoopDelayP99Ms: number;
  eventLoopUtilizationMax: number;
  heapBeforeMB: number;
  heapPeakMB: number;
  heapSettledMB: number;
  heapSizeLimitMB: number;
  rssPeakMB: number;
  /** Only available when the audit log file is readable from the test runner (local). */
  auditEvents?: number;
  auditKB?: number;
}

const toMB = (bytes: number) => Math.round(bytes / 1048576);
const percentile = (values: number[], p: number) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
};

const buildNestedAttributes = (title: string, panelCount: number) => {
  const panels: Record<string, unknown> = {};
  for (let i = 0; i < panelCount; i++) {
    panels[`p${i}`] = {
      title: `Panel ${i}`,
      vis: { type: 'histogram', params: { buckets: i, label: `bucket-${i}`, enabled: true } },
    };
  }
  return { title, description: 'perf', panels };
};

const buildDashboardPanel = (index: number) => ({
  version: '8.8.0',
  type: 'lens',
  gridData: {
    x: (index % 2) * 24,
    y: Math.floor(index / 2) * 15,
    w: 24,
    h: 15,
    i: `panel-${index}`,
  },
  panelIndex: `panel-${index}`,
  embeddableConfig: {
    attributes: {
      title: `Panel ${index}`,
      visualizationType: 'lnsXY',
      type: 'lens',
      references: [],
      state: {
        visualization: {
          legend: { isVisible: true, position: 'right' },
          valueLabels: 'hide',
          preferredSeriesType: 'bar_stacked',
          layers: [
            {
              layerId: `layer-${index}`,
              accessors: [`y${index}`],
              position: 'top',
              seriesType: 'bar_stacked',
              showGridlines: false,
              xAccessor: `x${index}`,
            },
          ],
        },
        datasourceStates: {
          indexpattern: {
            layers: {
              [`layer-${index}`]: {
                columnOrder: [`x${index}`, `y${index}`],
                columns: {
                  [`x${index}`]: {
                    label: '@timestamp',
                    dataType: 'date',
                    operationType: 'date_histogram',
                    sourceField: '@timestamp',
                    isBucketed: true,
                    scale: 'interval',
                    params: { interval: 'auto', includeEmptyRows: true },
                  },
                  [`y${index}`]: {
                    label: 'Count of records',
                    dataType: 'number',
                    operationType: 'count',
                    isBucketed: false,
                    scale: 'ratio',
                    sourceField: '___records___',
                  },
                },
              },
            },
          },
        },
        query: { language: 'kuery', query: '' },
        filters: [],
      },
    },
    enhancements: {},
  },
});

/**
 * Real dashboard saved object attributes. `panelsJSON` is a JSON-serialized string — a
 * title-only update keeps panelsJSON identical, so the diff emits one replace op on /title
 * and one noOp on /panelsJSON. The memory pressure is holding the full serialized string
 * (≈ panelCount × 800 bytes) before and after simultaneously during the diff phase.
 */
const buildDashboardAttributes = (title: string, panelCount: number) => ({
  title,
  description: 'perf test dashboard',
  panelsJSON: JSON.stringify(Array.from({ length: panelCount }, (_, i) => buildDashboardPanel(i))),
  optionsJSON: JSON.stringify({ hidePanelTitles: false, useMargins: true }),
  kibanaSavedObjectMeta: {
    searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [] }),
  },
});

const sampleProcess = async (
  apiClient: ApiClientFixture,
  headers: Record<string, string>
): Promise<ProcessSample> => {
  const res = await apiClient.get('api/stats?extended=true', { headers, responseType: 'json' });
  expect(res).toHaveStatusCode(200);
  const { process } = res.body;
  return {
    eventLoopDelayMaxMs: process.event_loop_delay ?? 0,
    eventLoopDelayP99Ms: process.event_loop_delay_histogram?.percentiles?.['99'] ?? 0,
    eventLoopUtilization: process.event_loop_utilization?.utilization ?? 0,
    heapUsedBytes: process.memory.heap.used_bytes,
    heapSizeLimitBytes: process.memory.heap.size_limit,
    rssBytes: process.memory.resident_set_size_bytes,
  };
};

/** Audit log size and line count, or `undefined` when the file is not readable (Cloud). */
const auditLogStats = () => {
  try {
    const size = statSync(AUDIT_LOG_PATH).size;
    const lines = readFileSync(AUDIT_LOG_PATH, 'utf8').split('\n').filter(Boolean).length;
    return { size, lines };
  } catch {
    return undefined;
  }
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Boundary-delimited multipart body for the saved objects import endpoint. */
const multipartNdjson = (ndjson: string, boundary: string) =>
  Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="perf.ndjson"\r\n` +
      `Content-Type: application/ndjson\r\n\r\n` +
      `${ndjson}\r\n` +
      `--${boundary}--\r\n`,
    'utf8'
  );

const results: WorkloadResult[] = [];

const toMarkdownTable = (rows: WorkloadResult[]) => {
  const header =
    '| workload | requests | lat p50 ms | lat p95 ms | EL delay max ms | EL delay p99 ms | EL util max | heap before MB | heap peak MB | heap settled MB | rss peak MB | audit events | audit KB |';
  const sep = '|' + '---|'.repeat(13);
  const body = rows.map(
    (r) =>
      `| ${r.workload} | ${r.requests} | ${r.latencyP50Ms} | ${r.latencyP95Ms} | ${
        r.eventLoopDelayMaxMs
      } | ${r.eventLoopDelayP99Ms} | ${r.eventLoopUtilizationMax} | ${r.heapBeforeMB} | ${
        r.heapPeakMB
      } | ${r.heapSettledMB} | ${r.rssPeakMB} | ${r.auditEvents ?? 'n/a'} | ${r.auditKB ?? 'n/a'} |`
  );
  return [header, sep, ...body].join('\n');
};

apiTest.describe(
  'Saved object audit diffs — performance measurements',
  { tag: [...tags.stateful.classic] },
  () => {
    const savedObjectsToCleanUp: Array<{ type: string; id: string }> = [];
    const stamp = Date.now();

    const authHeaders = async (samlAuth: SamlAuth) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      return { ...cookieHeader, ...KBN_HEADERS } as Record<string, string>;
    };

    /**
     * Runs `run`, polling process metrics every second meanwhile, then waits one ops
     * interval so the histogram covers the tail, and an 8s settle for the heap reading.
     */
    const measure = async (
      apiClient: ApiClientFixture,
      headers: Record<string, string>,
      workload: string,
      run: (recordLatencyMs: (ms: number) => void) => Promise<void>
    ): Promise<WorkloadResult> => {
      const before = await sampleProcess(apiClient, headers);
      const auditBefore = auditLogStats();
      const samples: ProcessSample[] = [];
      let polling = true;
      const poller = (async () => {
        while (polling) {
          try {
            samples.push(await sampleProcess(apiClient, headers));
          } catch {
            // a failed sample must not fail the workload
          }
          await sleep(1000);
        }
      })();

      const latencies: number[] = [];
      const started = performance.now();
      await run((ms) => latencies.push(ms));
      const wallMs = performance.now() - started;

      await sleep(2500);
      samples.push(await sampleProcess(apiClient, headers));
      polling = false;
      await poller;
      await sleep(8000);
      const settled = await sampleProcess(apiClient, headers);
      const auditAfter = auditLogStats();

      const row: WorkloadResult = {
        label: RUN_LABEL,
        workload,
        requests: latencies.length,
        wallMs: Math.round(wallMs),
        latencyP50Ms: Math.round(percentile(latencies, 50)),
        latencyP95Ms: Math.round(percentile(latencies, 95)),
        latencyMaxMs: Math.round(Math.max(...latencies)),
        eventLoopDelayMaxMs: Math.round(Math.max(...samples.map((s) => s.eventLoopDelayMaxMs))),
        eventLoopDelayP99Ms: Math.round(Math.max(...samples.map((s) => s.eventLoopDelayP99Ms))),
        eventLoopUtilizationMax: +Math.max(...samples.map((s) => s.eventLoopUtilization)).toFixed(
          2
        ),
        heapBeforeMB: toMB(before.heapUsedBytes),
        heapPeakMB: toMB(Math.max(...samples.map((s) => s.heapUsedBytes))),
        heapSettledMB: toMB(settled.heapUsedBytes),
        heapSizeLimitMB: toMB(settled.heapSizeLimitBytes),
        rssPeakMB: toMB(Math.max(...samples.map((s) => s.rssBytes))),
        ...(auditBefore &&
          auditAfter && {
            auditEvents: auditAfter.lines - auditBefore.lines,
            auditKB: Math.round((auditAfter.size - auditBefore.size) / 1024),
          }),
      };
      results.push(row);
      return row;
    };

    const timedRequest = async (
      send: () => Promise<any>,
      recordLatencyMs: (ms: number) => void
    ) => {
      const started = performance.now();
      const res = await send();
      recordLatencyMs(performance.now() - started);
      expect(res).toHaveStatusCode(200);
      return res;
    };

    apiTest.afterEach(async ({ apiClient, samlAuth }, testInfo) => {
      const latest = results[results.length - 1];
      if (latest) {
        await testInfo.attach(`${latest.workload}.json`, {
          body: JSON.stringify(latest, null, 2),
          contentType: 'application/json',
        });
      }
      if (!savedObjectsToCleanUp.length) return;
      const headers = await authHeaders(samlAuth);
      const objects = savedObjectsToCleanUp.splice(0);
      for (let i = 0; i < objects.length; i += 100) {
        await apiClient.post('api/saved_objects/_bulk_delete', {
          headers,
          body: objects.slice(i, i + 100),
          responseType: 'json',
        });
      }
    });

    apiTest('sequential bulk create of large nested objects', async ({ apiClient, samlAuth }) => {
      const headers = await authHeaders(samlAuth);
      const { batches, objectsPerBatch, panels } = SEQUENTIAL_BULK_CREATE;
      await measure(
        apiClient,
        headers,
        `bulk_create ${batches}x(${objectsPerBatch} x ${panels}-panel)`,
        async (record) => {
          for (let b = 0; b < batches; b++) {
            const objects = Array.from({ length: objectsPerBatch }, (_, i) => ({
              type: TYPE,
              id: `so-diff-perf-${stamp}-w1-${b}-${i}`,
              attributes: buildNestedAttributes('perf-w1', panels),
            }));
            await timedRequest(
              () =>
                apiClient.post('api/saved_objects/_bulk_create', {
                  headers,
                  body: objects,
                  responseType: 'json',
                }),
              record
            );
            savedObjectsToCleanUp.push(...objects.map(({ type, id }) => ({ type, id })));
          }
        }
      );
    });

    apiTest(
      'sequential single updates of one large nested object',
      async ({ apiClient, samlAuth }) => {
        const headers = await authHeaders(samlAuth);
        const id = `so-diff-perf-${stamp}-w2`;
        const created = await apiClient.post(`api/saved_objects/${TYPE}/${id}`, {
          headers,
          body: { attributes: buildNestedAttributes('perf-w2', BIG_OBJECT_PANELS) },
          responseType: 'json',
        });
        expect(created).toHaveStatusCode(200);
        savedObjectsToCleanUp.push({ type: TYPE, id });

        await measure(
          apiClient,
          headers,
          `update x${SINGLE_UPDATES} (${BIG_OBJECT_PANELS}-panel, title only)`,
          async (record) => {
            for (let i = 0; i < SINGLE_UPDATES; i++) {
              await timedRequest(
                () =>
                  apiClient.put(`api/saved_objects/${TYPE}/${id}`, {
                    headers,
                    body: { attributes: { title: `perf-w2-${i}` } },
                    responseType: 'json',
                  }),
                record
              );
            }
          }
        );
      }
    );

    apiTest('sequential bulk updates of medium nested objects', async ({ apiClient, samlAuth }) => {
      const headers = await authHeaders(samlAuth);
      const { rounds, objects: count, panels } = BULK_UPDATE;
      const objects = Array.from({ length: count }, (_, i) => ({
        type: TYPE,
        id: `so-diff-perf-${stamp}-w3-${i}`,
        attributes: buildNestedAttributes('perf-w3', panels),
      }));
      const created = await apiClient.post('api/saved_objects/_bulk_create', {
        headers,
        body: objects,
        responseType: 'json',
      });
      expect(created).toHaveStatusCode(200);
      savedObjectsToCleanUp.push(...objects.map(({ type, id }) => ({ type, id })));

      await measure(
        apiClient,
        headers,
        `bulk_update ${rounds}x(${count} x ${panels}-panel)`,
        async (record) => {
          for (let r = 0; r < rounds; r++) {
            await timedRequest(
              () =>
                apiClient.put('api/saved_objects/_bulk_update', {
                  headers,
                  body: objects.map(({ type, id }) => ({
                    type,
                    id,
                    attributes: { title: `perf-w3-${r}` },
                  })),
                  responseType: 'json',
                }),
              record
            );
          }
        }
      );
    });

    apiTest(
      'import with overwrite (exercises before-state reads)',
      async ({ apiClient, samlAuth }) => {
        const headers = await authHeaders(samlAuth);
        const { passes, objects: count, panels } = IMPORT;
        const objects = Array.from({ length: count }, (_, i) => ({
          type: TYPE,
          id: `so-diff-perf-${stamp}-w4-${i}`,
          attributes: buildNestedAttributes('perf-w4', panels),
          references: [],
        }));
        const boundary = `----so-diff-perf-${stamp}`;

        await measure(
          apiClient,
          headers,
          `import overwrite ${passes}x(${count} x ${panels}-panel)`,
          async (record) => {
            for (let pass = 0; pass < passes; pass++) {
              const ndjson = objects
                .map((o) =>
                  JSON.stringify({
                    ...o,
                    attributes: { ...o.attributes, title: `perf-w4-${pass}` },
                  })
                )
                .join('\n');
              await timedRequest(
                () =>
                  apiClient.post('api/saved_objects/_import?overwrite=true', {
                    headers: {
                      ...headers,
                      'content-type': `multipart/form-data; boundary=${boundary}`,
                    },
                    body: multipartNdjson(ndjson, boundary),
                    responseType: 'json',
                  }),
                record
              );
            }
            savedObjectsToCleanUp.push(...objects.map(({ type, id }) => ({ type, id })));
          }
        );
      }
    );

    apiTest('concurrent bulk creates', async ({ apiClient, samlAuth }) => {
      const headers = await authHeaders(samlAuth);
      const { rounds, parallel, objectsPerBatch, panels } = CONCURRENT;
      await measure(
        apiClient,
        headers,
        `concurrent ${rounds}x(${parallel} parallel bulk_create ${objectsPerBatch} x ${panels}-panel)`,
        async (record) => {
          for (let r = 0; r < rounds; r++) {
            const batches = Array.from({ length: parallel }, (_batch, b) =>
              Array.from({ length: objectsPerBatch }, (_object, i) => ({
                type: TYPE,
                id: `so-diff-perf-${stamp}-w5-${r}-${b}-${i}`,
                attributes: buildNestedAttributes('perf-w5', panels),
              }))
            );
            await Promise.all(
              batches.map(async (objects) => {
                await timedRequest(
                  () =>
                    apiClient.post('api/saved_objects/_bulk_create', {
                      headers,
                      body: objects,
                      responseType: 'json',
                    }),
                  record
                );
                savedObjectsToCleanUp.push(...objects.map(({ type, id }) => ({ type, id })));
              })
            );
          }
        }
      );
    });

    apiTest(
      'sequential single updates of a large real dashboard',
      async ({ apiClient, samlAuth }) => {
        const headers = await authHeaders(samlAuth);
        const id = `so-diff-perf-${stamp}-w6`;
        const created = await apiClient.post(`api/saved_objects/${DASHBOARD_TYPE}/${id}`, {
          headers,
          body: { attributes: buildDashboardAttributes('perf-w6', DASHBOARD_PANELS) },
          responseType: 'json',
        });
        expect(created).toHaveStatusCode(200);
        savedObjectsToCleanUp.push({ type: DASHBOARD_TYPE, id });

        await measure(
          apiClient,
          headers,
          `dashboard update x${DASHBOARD_UPDATES} (${DASHBOARD_PANELS}-panel, title only)`,
          async (record) => {
            for (let i = 0; i < DASHBOARD_UPDATES; i++) {
              await timedRequest(
                () =>
                  apiClient.put(`api/saved_objects/${DASHBOARD_TYPE}/${id}`, {
                    headers,
                    body: { attributes: { title: `perf-w6-${i}` } },
                    responseType: 'json',
                  }),
                record
              );
            }
          }
        );
      }
    );

    apiTest('summary', async ({ apiClient, samlAuth, log }, testInfo) => {
      const headers = await authHeaders(samlAuth);
      const status = await apiClient.get('api/status', { headers, responseType: 'json' });
      expect(status).toHaveStatusCode(200);
      expect(status.body.status.overall.level).toBe('available');

      const table = toMarkdownTable(results);
      log.info(`Saved object diff performance (${RUN_LABEL})\n\n${table}`);
      await testInfo.attach('saved_object_diff_perf.json', {
        body: JSON.stringify({ label: RUN_LABEL, results }, null, 2),
        contentType: 'application/json',
      });
      await testInfo.attach('saved_object_diff_perf.md', {
        body: `# Saved object diff performance (${RUN_LABEL})\n\n${table}\n`,
        contentType: 'text/markdown',
      });
    });
  }
);
