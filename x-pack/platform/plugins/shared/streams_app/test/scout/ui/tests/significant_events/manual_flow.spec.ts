/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import { test } from '../../fixtures';

const STREAM_NAME = 'logs.manual-sig-events';
const FEATURE_NAME = 'feature-one';

test.describe('Significant events - manual flow', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeAll(async ({ apiServices }) => {
    await apiServices.streams.forkStream('logs', STREAM_NAME, { never: {} });
    // create a feature so we can edit every property of the significant event
    await apiServices.streams.upsertFeature(STREAM_NAME, {
      type: 'system',
      name: FEATURE_NAME,
      description: 'test',
      filter: {
        field: 'service.name',
        eq: 'test',
      },
    });
  });

  test.beforeEach(async ({ pageObjects, browserAuth }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.streams.gotoSignificantEventsTab(STREAM_NAME);
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.streams.deleteStream(STREAM_NAME);
  });

  test('should create a new significant event', async ({ pageObjects }) => {
    await pageObjects.streams.createManualSignificantEventEntry();
    await pageObjects.streams.fillSignificantEventForm({
      id: '',
      title: 'my significant event',
      severity_score: 20,
      feature: {
        type: 'system',
        name: FEATURE_NAME,
        filter: {
          field: 'service.name',
          eq: 'test',
        },
      },
      kql: {
        query: 'service.name: test',
      },
    });

    await pageObjects.streams.saveSignificantEvent();

    await pageObjects.toasts.waitFor();
    expect(await pageObjects.toasts.getHeaderText()).toBe(
      'Saved significant event query successfully'
    );
  });

  test('should list significant events', async ({ pageObjects }) => {
    await pageObjects.streams.expectSignificantEventsTableVisible();
    await pageObjects.streams.expectSignificantEvents([
      {
        title: 'my significant event',
        feature: FEATURE_NAME,
        query: 'service.name: test',
        severity: 'Low',
      },
    ]);
  });

  test('should edit a significant event with no feature', async ({ pageObjects }) => {
    await pageObjects.streams.editSignificantEvent('my significant event');

    await pageObjects.streams.fillSignificantEventForm({
      id: '',
      title: 'my significant event updated',
      severity_score: 90,
      feature: undefined,
      kql: {
        query: 'service.name: updated',
      },
    });

    await pageObjects.streams.saveSignificantEvent(true);

    await pageObjects.toasts.waitFor();
    expect(await pageObjects.toasts.getHeaderText()).toBe(
      'Saved significant event query successfully'
    );

    await pageObjects.streams.expectSignificantEvents([
      {
        title: 'my significant event updated',
        feature: '--',
        query: 'service.name: updated',
        severity: 'Critical',
      },
    ]);
  });

  test('should edit a significant event with a feature', async ({ pageObjects }) => {
    await pageObjects.streams.editSignificantEvent('my significant event updated');

    await pageObjects.streams.fillSignificantEventForm({
      id: '',
      title: 'my significant event updated 2',
      severity_score: 50,
      feature: {
        type: 'system',
        name: FEATURE_NAME,
        filter: {
          field: 'service.name',
          eq: 'test',
        },
      },
      kql: {
        query: 'service.name: updated 2',
      },
    });

    await pageObjects.streams.saveSignificantEvent(true);

    await pageObjects.toasts.waitFor();
    expect(await pageObjects.toasts.getHeaderText()).toBe(
      'Saved significant event query successfully'
    );

    await pageObjects.streams.expectSignificantEvents([
      {
        title: 'my significant event updated 2',
        feature: FEATURE_NAME,
        query: 'service.name: updated 2',
        severity: 'Medium',
      },
    ]);
  });
});
