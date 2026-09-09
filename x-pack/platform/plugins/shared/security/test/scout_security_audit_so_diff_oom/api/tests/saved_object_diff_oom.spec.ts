/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, tags } from '@kbn/scout';
import type { ApiClientFixture } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { waitForDiffEvent } from '../../../scout_security_audit/api/helpers/audit_log';

const TYPE = 'index-pattern';
const KBN_HEADERS = { 'kbn-xsrf': 'x', 'x-elastic-internal-origin': 'kibana' };

const GIB = 1024 * 1024 * 1024;
const MAX_HEAP_SIZE_LIMIT_BYTES = Math.floor(1.8 * GIB);
const MAX_SETTLED_HEAP_USAGE_RATIO = 0.85;

// Nested plain objects (not arrays — flatten treats arrays as a single leaf) so
// create/update actually walks thousands of pointers, like a large dashboard.
const DEEP_PANEL_COUNT = 800;
const BULK_OBJECT_COUNT = 20;
const BULK_PANEL_COUNT = 80;

interface HeapMetrics {
  usedBytes: number;
  sizeLimitBytes: number;
  usageRatio: number;
}

const buildNestedAttributes = (title: string, panelCount: number) => {
  const panels: Record<string, unknown> = {};
  for (let i = 0; i < panelCount; i++) {
    panels[`p${i}`] = {
      title: `Panel ${i}`,
      vis: {
        type: 'histogram',
        params: { buckets: i, label: `bucket-${i}` },
      },
    };
  }
  return { title, name: title, panels };
};

const getHeapMetrics = async (
  apiClient: ApiClientFixture,
  headers: Record<string, string>
): Promise<HeapMetrics> => {
  const response = await apiClient.get('api/status', { headers, responseType: 'json' });
  const { used_in_bytes: usedBytes, size_limit: sizeLimitBytes } =
    response.body.metrics.process.memory.heap;
  return { usedBytes, sizeLimitBytes, usageRatio: usedBytes / sizeLimitBytes };
};

const waitForHeapUsageBelow = async (
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  maxUsageRatio: number,
  timeoutMs = 15_000
): Promise<HeapMetrics> => {
  const deadline = Date.now() + timeoutMs;
  let last: HeapMetrics | undefined;
  while (Date.now() < deadline) {
    last = await getHeapMetrics(apiClient, headers);
    if (last.usageRatio < maxUsageRatio) {
      return last;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(
    `Kibana heap usage did not settle below ${(maxUsageRatio * 100).toFixed(
      0
    )}% within ${timeoutMs}ms (last ratio=${last?.usageRatio.toFixed(3)})`
  );
};

/**
 * These tests run against a memory-constrained Kibana (1.5 GB old-space heap via
 * the security_audit_so_diff_oom server config set). Create/update of a large
 * nested saved object (and a bulk of smaller ones) forces flatten + json-patch
 * while diffs are enabled. If that work grows unbounded, Kibana OOMs or the
 * heap never settles and the suite fails.
 *
 * Run with:
 *   node scripts/scout start-server --arch stateful --domain classic --serverConfigSet security_audit_so_diff_oom
 *   node scripts/playwright test --project local --grep @stateful-classic \
 *     --config x-pack/platform/plugins/shared/security/test/scout_security_audit_so_diff_oom/api/playwright.config.ts
 */
apiTest.describe(
  'Saved object audit diffs OOM prevention',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    const savedObjectsToCleanUp: Array<{ type: string; id: string }> = [];

    const expectHeapUsageWithinBudget = async (
      apiClient: ApiClientFixture,
      headers: Record<string, string>
    ) => {
      const settledMetrics = await waitForHeapUsageBelow(
        apiClient,
        headers,
        MAX_SETTLED_HEAP_USAGE_RATIO
      );
      // Guard against accidentally running the suite on the default larger heap.
      expect(settledMetrics.sizeLimitBytes).toBeLessThan(MAX_HEAP_SIZE_LIMIT_BYTES);
    };

    apiTest.afterEach(async ({ apiClient, samlAuth }) => {
      if (!savedObjectsToCleanUp.length) {
        return;
      }
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      await apiClient.post('api/saved_objects/_bulk_delete', {
        headers: { ...cookieHeader, ...KBN_HEADERS },
        body: savedObjectsToCleanUp.splice(0),
        responseType: 'json',
      });
    });

    apiTest(
      'create and update a large nested object succeeds under constrained heap',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
        const headers = { ...cookieHeader, ...KBN_HEADERS };
        await expectHeapUsageWithinBudget(apiClient, headers);

        const id = `so-diff-oom-deep-${Date.now()}`;
        const createRes = await apiClient.post(`api/saved_objects/${TYPE}/${id}`, {
          headers,
          body: { attributes: buildNestedAttributes('oom-deep', DEEP_PANEL_COUNT) },
          responseType: 'json',
        });
        expect(createRes).toHaveStatusCode(200);
        savedObjectsToCleanUp.push({ type: TYPE, id });

        const createDiff = await waitForDiffEvent('saved_object_create', id);
        expect(createDiff.format).toBe('json_patch_extended');
        // Each panel contributes several leaves; this proves flatten walked the nest
        // rather than treating it as a single truncated field.
        expect(createDiff.ops.length).toBeGreaterThan(DEEP_PANEL_COUNT);

        const updateRes = await apiClient.put(`api/saved_objects/${TYPE}/${id}`, {
          headers,
          body: { attributes: { title: 'oom-deep-updated' } },
          responseType: 'json',
        });
        expect(updateRes).toHaveStatusCode(200);

        const updateDiff = await waitForDiffEvent('saved_object_update', id);
        expect(updateDiff.ops.find((op) => op.path === '/title')).toMatchObject({
          op: 'replace',
          value: 'oom-deep-updated',
          oldValue: 'oom-deep',
        });
        expect(updateDiff.noOps.length).toBeGreaterThan(DEEP_PANEL_COUNT);

        await expectHeapUsageWithinBudget(apiClient, headers);
      }
    );

    apiTest(
      'bulk create nested objects succeeds under constrained heap',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
        const headers = { ...cookieHeader, ...KBN_HEADERS };
        await expectHeapUsageWithinBudget(apiClient, headers);

        const stamp = Date.now();
        const objects = Array.from({ length: BULK_OBJECT_COUNT }, (_, i) => ({
          type: TYPE,
          id: `so-diff-oom-bulk-${stamp}-${i}`,
          attributes: buildNestedAttributes(`oom-bulk-${i}`, BULK_PANEL_COUNT),
        }));

        const res = await apiClient.post('api/saved_objects/_bulk_create', {
          headers,
          body: objects,
          responseType: 'json',
        });
        expect(res).toHaveStatusCode(200);
        savedObjectsToCleanUp.push(...objects.map(({ type, id }) => ({ type, id })));

        const firstId = objects[0].id;
        const lastId = objects[objects.length - 1].id;
        const firstDiff = await waitForDiffEvent('saved_object_create', firstId);
        const lastDiff = await waitForDiffEvent('saved_object_create', lastId);
        expect(firstDiff.ops.length).toBeGreaterThan(BULK_PANEL_COUNT);
        expect(lastDiff.ops.length).toBeGreaterThan(BULK_PANEL_COUNT);

        await expectHeapUsageWithinBudget(apiClient, headers);
      }
    );
  }
);
