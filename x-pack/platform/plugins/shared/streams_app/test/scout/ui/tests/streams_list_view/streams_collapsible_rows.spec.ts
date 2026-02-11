/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { test } from '../../fixtures';

test.describe(
  'Stream list view - expand and collapse streams in the table',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      // Clear existing rules
      await apiServices.streams.clearStreamChildren('logs');
      // Create a test stream with routing rules first
      await apiServices.streams.forkStream('logs', 'logs.child1', {
        field: 'service.name',
        eq: 'test-logs.child1-service',
      });
      await apiServices.streams.forkStream('logs', 'logs.child2', {
        field: 'service.name',
        eq: 'test-logs.child2-service',
      });
      await apiServices.streams.forkStream('logs', 'logs.child3', {
        field: 'service.name',
        eq: 'test-logs.child3-service',
      });

      // Create child streams for stream 'logs.child1'
      await apiServices.streams.forkStream('logs.child1', 'logs.child1.child1', {
        field: 'host.name',
        eq: 'test-logs.child1.child1-host',
      });
      await apiServices.streams.forkStream('logs.child1', 'logs.child1.child2', {
        field: 'host.name',
        eq: 'test-logs.child1.child2-host',
      });

      await pageObjects.streams.gotoStreamMainPage();
    });

    test('should expand and collapse', async ({ pageObjects }) => {
      await test.step('a stream node in the table', async () => {
        // Wait for the streams table to load
        await pageObjects.streams.expectStreamsTableVisible();

        // Verify that all child streams are initially expanded and visible
        await pageObjects.streams.verifyStreamsAreInTable([
          'logs.child1',
          'logs.child1.child1',
          'logs.child1.child2',
          'logs.child2',
          'logs.child3',
        ]);

        // Collapse the 'logs.child1' stream node
        await pageObjects.streams.collapseExpandStream('logs.child1', true);

        // Verify that the child streams are no longer visible
        await pageObjects.streams.verifyStreamsAreNotInTable([
          'logs.child1.child1',
          'logs.child1.child2',
        ]);

        // Expand the 'logs.child1' stream node
        await pageObjects.streams.collapseExpandStream('logs.child1', false);

        // Verify that the child streams are visible again
        await pageObjects.streams.verifyStreamsAreInTable([
          'logs.child1',
          'logs.child1.child1',
          'logs.child1.child2',
        ]);
      });

      await test.step('all stream nodes in the table', async () => {
        // Wait for the streams table to load
        await pageObjects.streams.expectStreamsTableVisible();

        // Collapse all stream nodes
        await pageObjects.streams.collapseAllStreams();

        // Verify that all child streams are no longer visible
        await pageObjects.streams.verifyStreamsAreNotInTable([
          'logs.child1',
          'logs.child2',
          'logs.child3',
        ]);

        // Expand all stream nodes
        await pageObjects.streams.expandAllStreams();

        // Verify that all child streams are visible
        await pageObjects.streams.verifyStreamsAreInTable([
          'logs.child1.child1',
          'logs.child1.child2',
          'logs.child2',
          'logs.child3',
        ]);

        // Collapse a single stream node to verify individual expand/collapse still works
        await pageObjects.streams.collapseExpandStream('logs.child1', true);
        await pageObjects.streams.verifyStreamsAreNotInTable([
          'logs.child1.child1',
          'logs.child1.child2',
        ]);

        // Expand all again to verify all nodes expand
        await pageObjects.streams.expandAllStreams();
        // Verify that all child streams are visible
        await pageObjects.streams.verifyStreamsAreInTable([
          'logs.child1.child1',
          'logs.child1.child2',
          'logs.child2',
          'logs.child3',
        ]);
      });
    });
  }
);
