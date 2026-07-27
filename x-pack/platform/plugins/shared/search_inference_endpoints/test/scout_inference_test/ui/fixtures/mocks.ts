/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

const CONNECTORS_ROUTE = '**/internal/inference/connectors';
const ENDPOINTS_ROUTE = '**/internal/inference_endpoints/endpoints';

interface MockEndpoint {
  inference_id: string;
  task_type: string;
  service: string;
  service_settings?: Record<string, unknown>;
  metadata?: {
    display?: { name?: string; model_creator?: string };
    heuristics?: {
      properties?: string[];
      status?: string;
      end_of_life_date?: string;
      release_date?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

const STACK_CONNECTOR = {
  connectorId: 'mock-connector',
  name: 'Mock Connector',
  type: '.gen-ai',
  config: {},
  capabilities: {},
  isPreconfigured: false,
};

// Mirrors the server-side transformation in getConnectorList: chat_completion
// inference endpoints surface in /internal/inference/connectors as Inference-type
// connectors so the Add Model popover can list them alongside stack connectors.
const endpointsAsConnectors = (endpoints: MockEndpoint[]) =>
  endpoints
    .filter((ep) => ep.task_type === 'chat_completion')
    .map((ep) => ({
      connectorId: ep.inference_id,
      name: ep.metadata?.display?.name ?? ep.inference_id,
      type: '.inference',
      config: {
        inferenceId: ep.inference_id,
        taskType: ep.task_type,
        service: ep.service,
        serviceSettings: ep.service_settings,
        modelCreator: ep.metadata?.display?.model_creator,
      },
      capabilities: {},
      isInferenceEndpoint: true,
      isPreconfigured: !!ep.metadata?.display?.name,
      isEis: ep.service === 'elastic',
      // Surface metadata at the top level so the deprecation logic in
      // model_settings.tsx (which reads connector.metadata.heuristics) and
      // the Add Model popover (which calls getModelStatus on it) work.
      metadata: ep.metadata,
    }));

const fulfillConnectors = async (page: ScoutPage, connectors: unknown[]) => {
  await page.route(CONNECTORS_ROUTE, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ connectors }),
    });
  });
};

export async function mockConnectors(page: ScoutPage) {
  await fulfillConnectors(page, [STACK_CONNECTOR]);
}

export async function mockEmptyConnectors(page: ScoutPage) {
  await fulfillConnectors(page, []);
}

export async function unmockConnectors(page: ScoutPage) {
  await page.unroute(CONNECTORS_ROUTE);
}

export async function mockInferenceEndpoints(page: ScoutPage, endpoints: MockEndpoint[]) {
  // Re-mock the connectors route so the Add Model popover (which reads from
  // /internal/inference/connectors only) sees the same endpoint set.
  await page.unroute(CONNECTORS_ROUTE);
  await fulfillConnectors(page, [STACK_CONNECTOR, ...endpointsAsConnectors(endpoints)]);

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

const REGION_POLICY_ROUTE = '**/internal/search_inference_endpoints/region_policy';

export interface MockRegionPolicy {
  allowed_regions?: Array<{ csp: string; region: string }>;
  allowed_geos?: string[];
}

export async function mockNoRegionPolicy(page: ScoutPage) {
  await page.route(REGION_POLICY_ROUTE, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'No region policy found' }),
      });
    } else if (route.request().method() === 'PUT') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ acknowledged: true }),
      });
    } else {
      await route.continue();
    }
  });
}

export async function mockRegionPolicy(page: ScoutPage, policy: MockRegionPolicy) {
  await page.route(REGION_POLICY_ROUTE, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          region_policy: policy,
          created_at: '2026-01-01T00:00:00Z',
        }),
      });
    } else if (route.request().method() === 'PUT') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ acknowledged: true }),
      });
    } else {
      await route.continue();
    }
  });
}

export async function mockRegionPolicyError(page: ScoutPage) {
  await page.route(REGION_POLICY_ROUTE, async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Internal server error' }),
    });
  });
}

export async function unmockRegionPolicy(page: ScoutPage) {
  await page.unroute(REGION_POLICY_ROUTE);
}
