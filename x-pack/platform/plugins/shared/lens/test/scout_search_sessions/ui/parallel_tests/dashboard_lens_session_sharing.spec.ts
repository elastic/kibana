/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A dashboard shares its search session with by-value Lens panels so that navigating to the
 * Lens editor and back hits the search cache. By-reference panels do not share the session.
 * See https://github.com/elastic/kibana/issues/99310.
 *
 * Both halves of that are asserted directly: the session id the panel reports, and the number of
 * search requests the browser puts on the wire when it comes back from the editor. A cache hit is
 * the absence of a request, so the by-value step counts zero.
 */

import { expect } from '@kbn/scout/ui';
import {
  spaceTest,
  LENS_BASIC_KBN_ARCHIVE,
  LOGSTASH_TIME_RANGE,
} from '@kbn/data-plugin/test/scout_search_sessions/ui/fixtures';

const LENS_TITLE = 'Artistpreviouslyknownaslens';

// The async search endpoint every dashboard panel goes through.
const SEARCH_REQUEST = { endpoint: '/internal/search/ese', method: 'POST' };

// A cache hit shows up as nothing happening, so the by-value step has to give a late request a
// window to arrive before it can conclude none did.
const SETTLE_MS = 1_000;

spaceTest.describe(
  'Dashboard search session sharing with Lens',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.cleanStandardList();
      await scoutSpace.savedObjects.load(LENS_BASIC_KBN_ARCHIVE);
      // setting the default time range up front keeps the spec focused on session sharing.
      await scoutSpace.uiSettings.setDefaultTime(LOGSTASH_TIME_RANGE);
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'shares the search session with a by-value Lens panel but not with a by-reference one',
      async ({ network, page, pageObjects }) => {
        // Counts the searches issued between leaving the Lens editor and the dashboard settling.
        // Scoped to that leg on purpose: the editor issues its own searches while it is open, and
        // those say nothing about whether the dashboard re-used the session.
        const countSearchesOnReturnFromEditor = () =>
          network.countMatchingRequests(SEARCH_REQUEST, async () => {
            await pageObjects.lens.saveAndReturn();
            await pageObjects.dashboard.waitForRenderComplete();
            await page.waitForTimeout(SETTLE_MS);
          });

        await spaceTest.step('add a by-reference Lens panel to a new dashboard', async () => {
          await pageObjects.dashboard.openNewDashboard();
          await pageObjects.dashboard.addPanelFromLibrary(LENS_TITLE);
          await pageObjects.dashboard.waitForRenderComplete();
        });

        await spaceTest.step(
          'navigating to the Lens editor and back starts a new session for a by-reference panel',
          async () => {
            await pageObjects.dashboard.openInspector(LENS_TITLE);
            const byRefSessionId = await pageObjects.inspector.getSearchSessionId();

            await pageObjects.dashboard.navigateToLensEditorFromPanel(LENS_TITLE);
            const searchCount = await countSearchesOnReturnFromEditor();

            await pageObjects.dashboard.openInspector(LENS_TITLE);
            const newByRefSessionId = await pageObjects.inspector.getSearchSessionId();
            expect(newByRefSessionId).not.toBe(byRefSessionId);
            // A new session means nothing is cached under it, so the panel has to search again.
            expect(searchCount).toBeGreaterThan(0);
          }
        );

        await spaceTest.step(
          'navigating to the Lens editor and back keeps the session for a by-value panel',
          async () => {
            await pageObjects.dashboard.unlinkFromLibrary(LENS_TITLE);
            await pageObjects.dashboard.waitForRenderComplete();

            await pageObjects.dashboard.openInspector(LENS_TITLE);
            const byValueSessionId = await pageObjects.inspector.getSearchSessionId();

            await pageObjects.dashboard.navigateToLensEditorFromPanel(LENS_TITLE);
            const searchCount = await countSearchesOnReturnFromEditor();

            await pageObjects.dashboard.openInspector(LENS_TITLE);
            const newByValueSessionId = await pageObjects.inspector.getSearchSessionId();
            expect(newByValueSessionId).toBe(byValueSessionId);
            // The session was kept, so the panel's request is served from the client-side cache
            // and never reaches the server. This is the cache hit issue #99310 asked for.
            expect(searchCount).toBe(0);
          }
        );
      }
    );
  }
);
