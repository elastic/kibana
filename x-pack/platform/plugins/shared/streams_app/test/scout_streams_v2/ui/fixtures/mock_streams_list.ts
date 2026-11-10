/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

/** Fakes `GET /api/streams` so the Classic tab doesn't depend on the stack's data streams. */
export const mockStreamsList = async (
  page: ScoutPage,
  streams: Array<{ name: string; type: 'classic' | 'wired' }>
) => {
  await page.route(
    (url) => url.pathname.endsWith('/api/streams'),
    async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ streams }),
      });
    }
  );
};
