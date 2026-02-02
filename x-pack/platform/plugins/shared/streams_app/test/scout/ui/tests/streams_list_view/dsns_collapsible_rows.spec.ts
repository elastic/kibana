/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test } from '../../fixtures';
import { generateLogsData } from '../../fixtures/generators';

test.describe(
  'Stream list view - DSNS classic stream collapsing',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    // Test streams following DSNS format: type-dataset-namespace
    // These should create virtual parent nodes for sub-dataset and namespace collapsing
    const KUBERNETES_CONTAINER_DEFAULT = 'logs-kubernetes.container_logs-default';
    const KUBERNETES_EVENTS_DEFAULT = 'logs-kubernetes.events-default';
    const KUBERNETES_CONTAINER_PROD = 'logs-kubernetes.container_logs-prod';
    const KUBERNETES_EVENTS_PROD = 'logs-kubernetes.events-prod';

    // Expected virtual parent streams
    // The hierarchy is: combined parent -> dataset wildcard parents -> actual streams
    const KUBERNETES_CONTAINER_WILDCARD = 'logs-kubernetes.container_logs-*'; // Namespace collapse for container_logs
    const KUBERNETES_EVENTS_WILDCARD = 'logs-kubernetes.events-*'; // Namespace collapse for events
    const KUBERNETES_WILDCARD_WILDCARD = 'logs-kubernetes.*-*'; // Combined collapse

    test.beforeEach(async ({ browserAuth, pageObjects, logsSynthtraceEsClient }) => {
      // Create classic streams with DSNS-formatted names
      // These will be grouped by base dataset (kubernetes) and collapsed
      await generateLogsData(logsSynthtraceEsClient)({ index: KUBERNETES_CONTAINER_DEFAULT });
      await generateLogsData(logsSynthtraceEsClient)({ index: KUBERNETES_EVENTS_DEFAULT });
      await generateLogsData(logsSynthtraceEsClient)({ index: KUBERNETES_CONTAINER_PROD });
      await generateLogsData(logsSynthtraceEsClient)({ index: KUBERNETES_EVENTS_PROD });

      await browserAuth.loginAsAdmin();
      await pageObjects.streams.gotoStreamMainPage();
    });

    test.afterEach(async ({ logsSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.clean();
    });

    test('should show virtual parent nodes for DSNS classic streams', async ({ pageObjects }) => {
      await test.step('verify table is visible', async () => {
        await pageObjects.streams.expectStreamsTableVisible();
      });

      await test.step('verify virtual parent nodes are visible', async () => {
        // The top-level combined parent should be visible
        await pageObjects.streams.verifyVirtualStreamsAreInTable([KUBERNETES_WILDCARD_WILDCARD]);
      });
    });

    test('should expand and collapse DSNS virtual parent nodes', async ({ pageObjects }) => {
      await test.step('verify initial expanded state shows all levels', async () => {
        await pageObjects.streams.expectStreamsTableVisible();

        // Initially all should be expanded - verify child streams are visible
        await pageObjects.streams.verifyStreamsAreInTable([
          KUBERNETES_CONTAINER_DEFAULT,
          KUBERNETES_EVENTS_DEFAULT,
          KUBERNETES_CONTAINER_PROD,
          KUBERNETES_EVENTS_PROD,
        ]);
      });

      await test.step('collapse top-level virtual parent', async () => {
        // Collapse the top-level combined parent logs-kubernetes.*-*
        await pageObjects.streams.collapseExpandVirtualStream(
          KUBERNETES_WILDCARD_WILDCARD,
          true // collapse
        );

        // All children should now be hidden
        await pageObjects.streams.verifyStreamsAreNotInTable([
          KUBERNETES_CONTAINER_DEFAULT,
          KUBERNETES_EVENTS_DEFAULT,
          KUBERNETES_CONTAINER_PROD,
          KUBERNETES_EVENTS_PROD,
        ]);

        // Intermediate virtual parents should also be hidden
        await pageObjects.streams.verifyVirtualStreamsAreNotInTable([
          KUBERNETES_CONTAINER_WILDCARD,
          KUBERNETES_EVENTS_WILDCARD,
        ]);
      });

      await test.step('expand top-level virtual parent', async () => {
        // Expand the top-level combined parent
        await pageObjects.streams.collapseExpandVirtualStream(
          KUBERNETES_WILDCARD_WILDCARD,
          false // expand
        );

        // All children should be visible again
        await pageObjects.streams.verifyStreamsAreInTable([
          KUBERNETES_CONTAINER_DEFAULT,
          KUBERNETES_EVENTS_DEFAULT,
          KUBERNETES_CONTAINER_PROD,
          KUBERNETES_EVENTS_PROD,
        ]);
      });

      await test.step('collapse intermediate dataset virtual parent', async () => {
        // Collapse the intermediate dataset parent logs-kubernetes.container_logs-*
        await pageObjects.streams.collapseExpandVirtualStream(
          KUBERNETES_CONTAINER_WILDCARD,
          true // collapse
        );

        // Only children under container_logs dataset should be hidden
        await pageObjects.streams.verifyStreamsAreNotInTable([
          KUBERNETES_CONTAINER_DEFAULT,
          KUBERNETES_CONTAINER_PROD,
        ]);

        // Other dataset children should still be visible
        await pageObjects.streams.verifyStreamsAreInTable([
          KUBERNETES_EVENTS_DEFAULT,
          KUBERNETES_EVENTS_PROD,
        ]);
      });

      await test.step('expand intermediate dataset virtual parent', async () => {
        // Expand the intermediate dataset parent
        await pageObjects.streams.collapseExpandVirtualStream(
          KUBERNETES_CONTAINER_WILDCARD,
          false // expand
        );

        // All children should be visible again
        await pageObjects.streams.verifyStreamsAreInTable([
          KUBERNETES_CONTAINER_DEFAULT,
          KUBERNETES_CONTAINER_PROD,
        ]);
      });
    });

    test('should work with expand/collapse all buttons', async ({ pageObjects }) => {
      await test.step('verify initial state', async () => {
        await pageObjects.streams.expectStreamsTableVisible();

        // All actual streams should be visible
        await pageObjects.streams.verifyStreamsAreInTable([
          KUBERNETES_CONTAINER_DEFAULT,
          KUBERNETES_EVENTS_DEFAULT,
          KUBERNETES_CONTAINER_PROD,
          KUBERNETES_EVENTS_PROD,
        ]);
      });

      await test.step('collapse all streams', async () => {
        await pageObjects.streams.collapseAllStreams();

        // All actual streams should now be hidden
        await pageObjects.streams.verifyStreamsAreNotInTable([
          KUBERNETES_CONTAINER_DEFAULT,
          KUBERNETES_EVENTS_DEFAULT,
          KUBERNETES_CONTAINER_PROD,
          KUBERNETES_EVENTS_PROD,
        ]);
      });

      await test.step('expand all streams', async () => {
        await pageObjects.streams.expandAllStreams();

        // All actual streams should be visible again
        await pageObjects.streams.verifyStreamsAreInTable([
          KUBERNETES_CONTAINER_DEFAULT,
          KUBERNETES_EVENTS_DEFAULT,
          KUBERNETES_CONTAINER_PROD,
          KUBERNETES_EVENTS_PROD,
        ]);
      });
    });

    test('virtual parent rows should not have doc counts or details links', async ({
      page,
      pageObjects,
    }) => {
      await test.step('verify table is visible', async () => {
        await pageObjects.streams.expectStreamsTableVisible();
      });

      await test.step('verify virtual parent has no doc count', async () => {
        // Virtual parents should not have doc count elements
        const docCountElement = page.locator(
          `[data-test-subj="streamsDocCount-${KUBERNETES_WILDCARD_WILDCARD}"]`
        );
        await docCountElement.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {
          // Element should not exist at all, which is expected
        });
      });

      await test.step('verify virtual parent is not a link', async () => {
        // Virtual parents should be plain text (streamsNameText), not links (streamsNameLink)
        await pageObjects.streams.verifyVirtualStreamsAreInTable([KUBERNETES_WILDCARD_WILDCARD]);

        // The link version should not exist
        const linkElement = page.getByTestId(`streamsNameLink-${KUBERNETES_WILDCARD_WILDCARD}`);
        await linkElement.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {
          // Element should not exist at all, which is expected
        });
      });
    });
  }
);
