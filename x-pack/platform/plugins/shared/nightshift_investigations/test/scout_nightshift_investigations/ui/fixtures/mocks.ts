/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

export const mockStartInvestigation = async (page: ScoutPage) => {
  await page.route('**/internal/nightshift/investigations', async (route) => {
    await route.fulfill({ status: 200, json: { investigation_id: 'investigation-1' } });
  });
};
