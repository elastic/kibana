/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, safeDeleteStream, cleanupTestStreams } from '../../fixtures';

test.describe(
  'Stream list view - expand and collapse streams in the table',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    let streamNames: string[] = [];

    test.beforeEach(async ({ apiServices, browserAuth, pageObjects }, testInfo) => {
      await browserAuth.loginAsAdmin();

      const workerSuffix = `w${testInfo.parallelIndex}`;

      // Create unique stream names for this worker
      const child1 = `logs.child1-${workerSuffix}`;
      const child2 = `logs.child2-${workerSuffix}`;
      const child3 = `logs.child3-${workerSuffix}`;
      const child1Child1 = `${child1}.child1`;
      const child1Child2 = `${child1}.child2`;

      streamNames = [child1, child2, child3, child1Child1, child1Child2];

      // Clean up any existing streams from previous runs
      for (const name of [...streamNames].reverse()) {
        await safeDeleteStream(apiServices, name);
      }

      // Create test streams
      await apiServices.streams.forkStream('logs', child1, {
        field: 'service.name',
        eq: `test-${child1}-service`,
      });
      await apiServices.streams.forkStream('logs', child2, {
        field: 'service.name',
        eq: `test-${child2}-service`,
      });
      await apiServices.streams.forkStream('logs', child3, {
        field: 'service.name',
        eq: `test-${child3}-service`,
      });

      // Create child streams for stream 'child1'
      await apiServices.streams.forkStream(child1, child1Child1, {
        field: 'host.name',
        eq: `test-${child1Child1}-host`,
      });
      await apiServices.streams.forkStream(child1, child1Child2, {
        field: 'host.name',
        eq: `test-${child1Child2}-host`,
      });

      await pageObjects.streams.gotoStreamMainPage();
    });

    test.afterEach(async ({ apiServices }) => {
      await cleanupTestStreams(apiServices, streamNames);
    });

    test('should expand and collapse', async ({ pageObjects }, testInfo) => {
      const workerSuffix = `w${testInfo.parallelIndex}`;
      const child1 = `logs.child1-${workerSuffix}`;
      const child2 = `logs.child2-${workerSuffix}`;
      const child3 = `logs.child3-${workerSuffix}`;
      const child1Child1 = `${child1}.child1`;
      const child1Child2 = `${child1}.child2`;

      await test.step('a stream node in the table', async () => {
        // Wait for the streams table to load
        await pageObjects.streams.expectStreamsTableVisible();

        // Verify that all child streams are initially expanded and visible
        await pageObjects.streams.verifyStreamsAreInTable([
          child1,
          child1Child1,
          child1Child2,
          child2,
          child3,
        ]);

        // Collapse the 'child1' stream node
        await pageObjects.streams.collapseExpandStream(child1, true);

        // Verify that the child streams are no longer visible
        await pageObjects.streams.verifyStreamsAreNotInTable([child1Child1, child1Child2]);

        // Expand the 'child1' stream node
        await pageObjects.streams.collapseExpandStream(child1, false);

        // Verify that the child streams are visible again
        await pageObjects.streams.verifyStreamsAreInTable([child1, child1Child1, child1Child2]);
      });

      await test.step('all stream nodes in the table', async () => {
        // Wait for the streams table to load
        await pageObjects.streams.expectStreamsTableVisible();

        // Collapse all stream nodes
        await pageObjects.streams.collapseAllStreams();

        // Verify that all child streams are no longer visible
        await pageObjects.streams.verifyStreamsAreNotInTable([child1, child2, child3]);

        // Expand all stream nodes
        await pageObjects.streams.expandAllStreams();

        // Verify that all child streams are visible
        await pageObjects.streams.verifyStreamsAreInTable([
          child1Child1,
          child1Child2,
          child2,
          child3,
        ]);

        // Collapse a single stream node to verify individual expand/collapse still works
        await pageObjects.streams.collapseExpandStream(child1, true);
        await pageObjects.streams.verifyStreamsAreNotInTable([child1Child1, child1Child2]);

        // Expand all again to verify all nodes expand
        await pageObjects.streams.expandAllStreams();
        // Verify that all child streams are visible
        await pageObjects.streams.verifyStreamsAreInTable([
          child1Child1,
          child1Child2,
          child2,
          child3,
        ]);
      });
    });
  }
);
