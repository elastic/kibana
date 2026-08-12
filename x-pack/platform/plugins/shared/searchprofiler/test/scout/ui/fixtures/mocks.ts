/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

export const mockNoShardsProfileResponse = async (page: ScoutPage) => {
  await page.route('**/api/searchprofiler/profile', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        resp: {
          _shards: {
            total: 0,
            successful: 0,
            skipped: 0,
            failed: 0,
          },
        },
      }),
    });
  });
};
