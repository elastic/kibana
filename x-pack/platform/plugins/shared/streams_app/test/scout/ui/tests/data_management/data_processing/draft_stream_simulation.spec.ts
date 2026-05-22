/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import {
  OBSERVABILITY_STREAMS_ENABLE_WIRED_STREAM_VIEWS,
  OBSERVABILITY_STREAMS_ENABLE_DRAFT_STREAMS,
} from '@kbn/management-settings-ids';
import { expect } from '@kbn/scout/ui';
import { test } from '../../../fixtures';

const ROOT_STREAM = 'logs.otel';
const MATERIALIZED_PARENT = 'logs.otel.scout-ui-draft';
const DRAFT_CHILD = 'logs.otel.scout-ui-draft.child';

test.describe(
  'Draft stream simulation - processing preview',
  { tag: tags.stateful.classic },
  () => {
    test.beforeAll(async ({ kbnClient, esClient, apiServices }) => {
      await kbnClient.uiSettings.update({
        [OBSERVABILITY_STREAMS_ENABLE_WIRED_STREAM_VIEWS]: true,
        [OBSERVABILITY_STREAMS_ENABLE_DRAFT_STREAMS]: true,
      });

      await apiServices.streams.restoreDataStream(ROOT_STREAM);

      // Create forks BEFORE seeding data so the routing rules are active.
      await apiServices.streams.forkStream(ROOT_STREAM, MATERIALIZED_PARENT, {
        field: 'resource.attributes.host.name',
        eq: 'scout-ui-draft-host',
      });

      await kbnClient.request({
        method: 'POST',
        path: `/api/streams/${MATERIALIZED_PARENT}/_fork`,
        body: {
          stream: { name: DRAFT_CHILD },
          where: { field: 'severity_text', eq: 'error' },
          draft: true,
        },
      });

      // Seed OTEL-compliant documents AFTER forks so routing directs them to
      // the materialized parent. Using nested OTEL structure ensures
      // normalize_for_stream keeps severity_text at the top level (instead of
      // moving it under attributes, which breaks ES|QL passthrough resolution).
      const operations = Array.from({ length: 10 }, (_, i) => [
        { create: {} },
        {
          '@timestamp': new Date(Date.now() - i * 60_000).toISOString(),
          severity_text: 'error',
          body: { text: `ERROR scout draft test message ${i}` },
          resource: {
            attributes: {
              'host.name': 'scout-ui-draft-host',
            },
          },
        },
      ]).flat();

      await esClient.bulk({ index: ROOT_STREAM, operations, refresh: true });
    });

    test.beforeEach(async ({ browserAuth, apiServices, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await apiServices.streams.clearStreamProcessors(DRAFT_CHILD);
      await pageObjects.streams.gotoProcessingTab(DRAFT_CHILD);
      await pageObjects.streams.switchToColumnsView();
    });

    test.afterAll(async ({ kbnClient, apiServices }) => {
      for (const name of [DRAFT_CHILD, MATERIALIZED_PARENT]) {
        try {
          await apiServices.streams.deleteStream(name);
        } catch {
          // stream may already be gone
        }
      }

      await kbnClient.uiSettings.update({
        [OBSERVABILITY_STREAMS_ENABLE_WIRED_STREAM_VIEWS]: false,
        [OBSERVABILITY_STREAMS_ENABLE_DRAFT_STREAMS]: false,
      });
    });

    test('should display sample documents from the parent stream for a draft', async ({
      pageObjects,
    }) => {
      const rows = await pageObjects.streams.getPreviewTableRows();
      expect(rows.length).toBeGreaterThan(0);
    });

    test('should simulate a Set processor and show processed results in preview', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.streams.clickAddProcessor();
      await pageObjects.streams.selectProcessorType('Set');
      await pageObjects.streams.fillProcessorFieldInput('attributes.draft_flag', {
        isCustomValue: true,
      });
      await page.locator('input[name="value"]').fill('draft-processed');
      await pageObjects.streams.clickSaveProcessor();

      const rows = await pageObjects.streams.getPreviewTableRows();
      expect(rows.length).toBeGreaterThan(0);

      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        await pageObjects.streams.expectCellValueContains({
          columnName: 'attributes.draft_flag',
          rowIndex,
          value: 'draft-processed',
        });
      }
    });

    test('should simulate a Rename processor on a draft stream', async ({ page, pageObjects }) => {
      await pageObjects.streams.clickAddProcessor();
      await pageObjects.streams.selectProcessorType('Rename');
      await pageObjects.streams.fillProcessorFieldInput('severity_text');
      await page.locator('input[name="to"]').fill('attributes.log_level');
      await pageObjects.streams.clickSaveProcessor();

      const rows = await pageObjects.streams.getPreviewTableRows();
      expect(rows.length).toBeGreaterThan(0);

      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        await pageObjects.streams.expectCellValueContains({
          columnName: 'attributes.log_level',
          rowIndex,
          value: 'error',
        });
      }
    });

    test('should update simulation preview reactively when configuring a new processor', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.streams.clickAddProcessor();
      await pageObjects.streams.selectProcessorType('Set');
      await pageObjects.streams.fillProcessorFieldInput('attributes.step_one', {
        isCustomValue: true,
      });
      await page.locator('input[name="value"]').fill('first');

      // Preview should update reactively
      const rows = await pageObjects.streams.getPreviewTableRows();
      expect(rows.length).toBeGreaterThan(0);

      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        await pageObjects.streams.expectCellValueContains({
          columnName: 'attributes.step_one',
          rowIndex,
          value: 'first',
        });
      }
    });

    test('should simulate multiple sequential processors on a draft stream', async ({
      page,
      pageObjects,
    }) => {
      // First processor: Set a field
      await pageObjects.streams.clickAddProcessor();
      await pageObjects.streams.selectProcessorType('Set');
      await pageObjects.streams.fillProcessorFieldInput('attributes.pipeline_stage', {
        isCustomValue: true,
      });
      await page.locator('input[name="value"]').fill('enriched');
      await pageObjects.streams.clickSaveProcessor();

      // Second processor: Set another field
      await pageObjects.streams.clickAddProcessor();
      await pageObjects.streams.selectProcessorType('Set');
      await pageObjects.streams.fillProcessorFieldInput('attributes.env', {
        isCustomValue: true,
      });
      await page.locator('input[name="value"]').fill('staging');
      await pageObjects.streams.clickSaveProcessor();

      const rows = await pageObjects.streams.getPreviewTableRows();
      expect(rows.length).toBeGreaterThan(0);

      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        await pageObjects.streams.expectCellValueContains({
          columnName: 'attributes.pipeline_stage',
          rowIndex,
          value: 'enriched',
        });
        await pageObjects.streams.expectCellValueContains({
          columnName: 'attributes.env',
          rowIndex,
          value: 'staging',
        });
      }
    });
  }
);
