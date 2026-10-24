/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

export const mockEmptyPipelinesList = async (page: ScoutPage) => {
  await page.route('**/api/ingest_pipelines', (route) =>
    route.request().method() === 'GET' ? route.fulfill({ json: [] }) : route.continue()
  );
};
