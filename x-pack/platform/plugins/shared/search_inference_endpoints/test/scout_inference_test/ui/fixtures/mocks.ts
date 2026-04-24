/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

const CONNECTORS_ROUTE = '**/internal/inference/connectors';
const ENDPOINTS_ROUTE = '**/internal/inference_endpoints/endpoints';

export async function mockConnectors(page: ScoutPage) {
  await page.route(CONNECTORS_ROUTE, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        connectors: [
          {
            connectorId: 'mock-connector',
            name: 'Mock Connector',
            type: '.gen-ai',
            config: {},
            capabilities: {},
            isPreconfigured: false,
          },
        ],
      }),
    });
  });
}

export async function mockEmptyConnectors(page: ScoutPage) {
  await page.route(CONNECTORS_ROUTE, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ connectors: [] }),
    });
  });
}

export async function unmockConnectors(page: ScoutPage) {
  await page.unroute(CONNECTORS_ROUTE);
}

export async function mockInferenceEndpoints(page: ScoutPage, endpoints: unknown[]) {
  await page.route(ENDPOINTS_ROUTE, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ inference_endpoints: endpoints }),
    });
  });
}

export async function unmockInferenceEndpoints(page: ScoutPage) {
  await page.unroute(ENDPOINTS_ROUTE);
}
