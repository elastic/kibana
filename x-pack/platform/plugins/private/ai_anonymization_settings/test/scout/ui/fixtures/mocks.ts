/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

type LicenseType = 'basic' | 'gold' | 'platinum' | 'enterprise';

/**
 * Makes the browser see the given license type, without touching the cluster: the licensing plugin
 * reads its license from `/api/licensing/info`, so patching that response is enough for everything
 * that follows the public `license$`. The server still sees the real license.
 */
export const mockLicenseType = async (page: ScoutPage, type: LicenseType) => {
  await page.route('**/api/licensing/info', async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    await route.fulfill({
      response,
      json: { ...body, license: { ...body.license, type, mode: type } },
    });
  });
};
