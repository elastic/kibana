/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';
import { subj } from '@kbn/test-subj-selector';
import { setupLargeWiredHierarchy } from '../synthtrace_data/streams_data';

const STREAMS_SEARCH_SELECTOR = 'input[aria-label="Search streams by name"]';
const STREAMS_EXPAND_ALL_BUTTON = subj('streamsExpandAllButton');
const STREAMS_COLLAPSE_ALL_BUTTON = subj('streamsCollapseAllButton');
// Root wired streams reject `wired.fields` updates. For "high in hierarchy" amplification,
// mutate a scale parent directly under `logs.otel`.
const WIRED_SCALE_PARENT_STREAM = 'logs.otel.perf_parent';
const WIRED_CHILD_FIRST_NAME = `${WIRED_SCALE_PARENT_STREAM}.perf_child_0001`;
const WIRED_CHILD_MIDDLE_NAME = `${WIRED_SCALE_PARENT_STREAM}.perf_child_0500`;
const WIRED_CHILD_FIRST = subj(`streamsNameLink-${WIRED_CHILD_FIRST_NAME}`);
const WIRED_CHILD_MIDDLE = subj(`streamsNameLink-${WIRED_CHILD_MIDDLE_NAME}`);
const WIRED_HIERARCHY_COUNT = 1000;
const WIRED_HIERARCHY_STRATEGY = 'import' as const;
const DELETE_BATCH_CONCURRENCY = 10;
const DELETE_COUNT = 200;

interface PageEvaluateLike {
  evaluate<R, Arg>(pageFunction: (arg: Arg) => R | Promise<R>, arg: Arg): Promise<R>;
}

const updateIngestViaApi = async ({
  page,
  streamName,
  wiredFieldsToAdd,
  lifecycle,
}: {
  page: PageEvaluateLike;
  streamName: string;
  wiredFieldsToAdd?: Record<string, unknown>;
  lifecycle?: unknown;
}) => {
  await page.evaluate(
    async ({ targetStreamName, fieldsToAdd, newLifecycle }) => {
      const headers = {
        'kbn-xsrf': 'streams-perf-test',
        'x-elastic-internal-origin': 'kibana',
        'elastic-api-version': '2023-10-31',
        'Content-Type': 'application/json',
      };

      const getRes = await fetch(`/api/streams/${targetStreamName}/_ingest`, { headers });
      if (!getRes.ok) throw new Error(`GET _ingest failed: ${getRes.status}`);
      const { ingest } = await getRes.json();

      const { updated_at: _updatedAt, ...processing } = ingest.processing;

      if (fieldsToAdd) {
        ingest.wired.fields = { ...(ingest.wired.fields ?? {}), ...fieldsToAdd };
      }
      const effectiveLifecycle = newLifecycle ?? ingest.lifecycle;

      const putRes = await fetch(`/api/streams/${targetStreamName}/_ingest`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          ingest: {
            processing,
            settings: ingest.settings,
            wired: ingest.wired,
            lifecycle: effectiveLifecycle,
            failure_store: ingest.failure_store,
          },
        }),
      });
      if (!putRes.ok) {
        const text = await putRes.text();
        throw new Error(`PUT _ingest failed: ${putRes.status} ${text}`);
      }
    },
    {
      targetStreamName: streamName,
      fieldsToAdd: wiredFieldsToAdd,
      newLifecycle: lifecycle,
    }
  );
};

export const journey = new Journey({
  ftrConfigPath: 'x-pack/performance/configs/streams_heavy_config.ts',
  beforeSteps: async ({ kibanaServer, es, log }) => {
    await setupLargeWiredHierarchy(kibanaServer, es, log, {
      count: WIRED_HIERARCHY_COUNT,
      strategy: WIRED_HIERARCHY_STRATEGY,
    });
  },
})
  .step('Go to Streams listing page', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get('/app/streams'));
    await page.waitForSelector(subj('streamsTable'), { timeout: 120000 });
  })
  .step('Expand all streams to reveal wired children', async ({ page }) => {
    const expandAllButton = page.locator(STREAMS_EXPAND_ALL_BUTTON).first();
    const collapseAllButton = page.locator(STREAMS_COLLAPSE_ALL_BUTTON).first();

    if (await expandAllButton.isVisible().catch(() => false)) {
      await expandAllButton.click();
    } else {
      await collapseAllButton.waitFor({ state: 'visible', timeout: 60000 });
      await collapseAllButton.click();
      await expandAllButton.waitFor({ state: 'visible', timeout: 60000 });
      await expandAllButton.click();
    }

    await page.waitForSelector(WIRED_CHILD_FIRST, { timeout: 60000 });
  })
  .step('Search for a wired child stream', async ({ page, inputDelays }) => {
    const searchBox = page.locator(STREAMS_SEARCH_SELECTOR).first();
    await searchBox.waitFor({ state: 'visible', timeout: 60000 });
    await searchBox.fill('');
    await searchBox.type(WIRED_CHILD_MIDDLE_NAME, { delay: inputDelays.TYPING });
    await page.waitForSelector(WIRED_CHILD_MIDDLE, { timeout: 60000 });
  })
  .step('Clear search', async ({ page }) => {
    const searchBox = page.locator(STREAMS_SEARCH_SELECTOR).first();
    await searchBox.waitFor({ state: 'visible', timeout: 60000 });
    await searchBox.fill('');
    await page.waitForSelector(subj('streamsTable'));
  })
  .step('Collapse all streams', async ({ page }) => {
    const collapseAllButton = page.locator(STREAMS_COLLAPSE_ALL_BUTTON).first();
    const expandAllButton = page.locator(STREAMS_EXPAND_ALL_BUTTON).first();

    if (await collapseAllButton.isVisible().catch(() => false)) {
      await collapseAllButton.click();
    } else {
      // Already collapsed; keep this step idempotent to reduce UI-state flakes.
      await expandAllButton.waitFor({ state: 'visible', timeout: 60000 });
    }

    await page.waitForSelector(subj('streamsTable'));
  })
  .step('Navigate to a wired child detail page', async ({ page }) => {
    const logsExpandButton = page.locator(subj('expandButton-logs.otel'));
    if (await logsExpandButton.isVisible().catch(() => false)) {
      await logsExpandButton.click();
    }
    const parentExpandButton = page.locator(subj(`expandButton-${WIRED_SCALE_PARENT_STREAM}`));
    if (await parentExpandButton.isVisible().catch(() => false)) {
      await parentExpandButton.click();
    }
    const streamLink = page.locator(subj(`streamsNameLink-${WIRED_CHILD_FIRST_NAME}`));
    await streamLink.waitFor({ state: 'visible', timeout: 60000 });
    await streamLink.click();
    await page.waitForSelector(subj('wiredStreamBadge'), { timeout: 60000 });
  })
  .step('Navigate to scale parent stream partitioning tab', async ({ page, kbnUrl }) => {
    await page.goto(
      kbnUrl.get(`/app/streams/${WIRED_SCALE_PARENT_STREAM}/management/partitioning`)
    );
    await page.waitForSelector(subj('streamsAppStreamDetailRoutingAddRuleButton'), {
      timeout: 120000,
    });
  })
  .step('Verify routing rules render at scale', async ({ page }) => {
    await page.waitForSelector(subj(`routingRule-${WIRED_CHILD_FIRST_NAME}`), {
      timeout: 60000,
    });
  })
  .step('Add field mapping on scale parent stream via API', async ({ page }) => {
    await updateIngestViaApi({
      page,
      streamName: WIRED_SCALE_PARENT_STREAM,
      wiredFieldsToAdd: { 'attributes.perf_hierarchy_field': { type: 'keyword' } },
    });
  })
  .step(
    'Verify child schema page loads after scale parent field update',
    async ({ page, kbnUrl }) => {
      await page.goto(kbnUrl.get(`/app/streams/${WIRED_CHILD_FIRST_NAME}/management/schema`));
      await page.waitForSelector(subj('streamsAppContentAddFieldButton'), { timeout: 120000 });
    }
  )
  .step('Set complex retention on scale parent stream via API', async ({ page }) => {
    await updateIngestViaApi({
      page,
      streamName: WIRED_SCALE_PARENT_STREAM,
      lifecycle: {
        dsl: {
          data_retention: '30d',
          downsample: [
            { after: '0d', fixed_interval: '1h' },
            { after: '1d', fixed_interval: '2h' },
            { after: '3d', fixed_interval: '4h' },
            { after: '7d', fixed_interval: '8h' },
            { after: '14d', fixed_interval: '1d' },
            { after: '30d', fixed_interval: '2d' },
            { after: '60d', fixed_interval: '4d' },
            { after: '90d', fixed_interval: '8d' },
            { after: '180d', fixed_interval: '16d' },
            { after: '365d', fixed_interval: '32d' },
          ],
        },
      },
    });
  })
  .step('Verify retention page loads after complex update', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get(`/app/streams/${WIRED_SCALE_PARENT_STREAM}/management/retention`));
    await page.waitForSelector(subj('streamsAppRetentionMetadataEditDataRetentionButton'), {
      timeout: 120000,
    });
  })
  .step(
    `Delete ${DELETE_COUNT} child streams via API (batches of ${DELETE_BATCH_CONCURRENCY})`,
    async ({ page }) => {
      const deleteStart = WIRED_HIERARCHY_COUNT - DELETE_COUNT + 1;
      const streamsToDelete = Array.from({ length: DELETE_COUNT }, (_, index) => {
        const i = deleteStart + index;
        return `${WIRED_SCALE_PARENT_STREAM}.perf_child_${String(i).padStart(4, '0')}`;
      });

      await page.evaluate(
        async ({ streamNames, batchSize }) => {
          const headers = {
            'kbn-xsrf': 'streams-perf-test',
            'x-elastic-internal-origin': 'kibana',
            'elastic-api-version': '2023-10-31',
          };

          const batches = Array.from(
            { length: Math.ceil(streamNames.length / batchSize) },
            (_, batchIndex) =>
              streamNames.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize)
          );

          for (const [batchIndex, batch] of batches.entries()) {
            const batchLabel = `Batch ${batchIndex + 1}/${batches.length}`;
            const results = await Promise.allSettled(
              batch.map((name) =>
                fetch(`/api/streams/${name}`, {
                  method: 'DELETE',
                  headers,
                }).then(async (res) => {
                  if (!res.ok && res.status !== 404) {
                    const text = await res.text();
                    throw new Error(`DELETE ${name}: ${res.status} ${text}`);
                  }
                })
              )
            );

            const failures = results.filter(
              (r): r is PromiseRejectedResult => r.status === 'rejected'
            );
            if (failures.length > 0) {
              const msgs = failures.map((f) => f.reason?.message ?? f.reason).join('; ');
              throw new Error(`${batchLabel} delete failed: ${msgs}`);
            }
          }

          const spotChecks = [
            streamNames[0],
            streamNames[Math.floor(streamNames.length / 2)],
            streamNames[streamNames.length - 1],
          ];
          for (const name of spotChecks) {
            const res = await fetch(`/api/streams/${name}`, {
              method: 'GET',
              headers,
            });
            if (res.status !== 404) {
              const text = await res.text();
              throw new Error(`Expected ${name} deleted (404), got ${res.status} ${text}`);
            }
          }
        },
        {
          streamNames: streamsToDelete,
          batchSize: DELETE_BATCH_CONCURRENCY,
        }
      );
    }
  )
  .step('Verify deletion on listing page', async ({ page, kbnUrl, inputDelays }) => {
    const deletedIdx = String(WIRED_HIERARCHY_COUNT).padStart(4, '0');
    const survivingIdx = String(WIRED_HIERARCHY_COUNT - DELETE_COUNT).padStart(4, '0');
    const deletedChildName = `${WIRED_SCALE_PARENT_STREAM}.perf_child_${deletedIdx}`;
    const survivingChildName = `${WIRED_SCALE_PARENT_STREAM}.perf_child_${survivingIdx}`;
    const survivingChildSelector = subj(`streamsNameLink-${survivingChildName}`);
    const deletedChildSelector = subj(`streamsNameLink-${deletedChildName}`);

    await page.goto(kbnUrl.get('/app/streams'));
    await page.waitForSelector(subj('streamsTable'), { timeout: 120000 });

    const searchBox = page.locator(STREAMS_SEARCH_SELECTOR).first();
    await searchBox.waitFor({ state: 'visible', timeout: 60000 });

    // First prove the UI can still find a surviving child after the deletion batch.
    await searchBox.fill('');
    await searchBox.type(survivingChildName, { delay: inputDelays.TYPING });
    await page.waitForSelector(survivingChildSelector, { timeout: 60000 });

    // Then search for a deleted child and wait for the UI to apply the new filter.
    await searchBox.fill('');
    await searchBox.type(deletedChildName, { delay: inputDelays.TYPING });
    await page.waitForFunction(
      ({ inputSelector, expectedInputValue, selectorsThatMustBeAbsent }) => {
        const input = document.querySelector<HTMLInputElement>(inputSelector);
        if (!input || input.value !== expectedInputValue) return false;

        return selectorsThatMustBeAbsent.every((selector) => !document.querySelector(selector));
      },
      {
        inputSelector: STREAMS_SEARCH_SELECTOR,
        expectedInputValue: deletedChildName,
        selectorsThatMustBeAbsent: [survivingChildSelector, deletedChildSelector],
      },
      { timeout: 60000 }
    );
  });
