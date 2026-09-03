/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

// ---------------------------------------------------------------------------
// Package policy list
// ---------------------------------------------------------------------------

/** Intercepts GET /api/fleet/package_policies and returns an empty list. */
export async function mockPackagePoliciesEmpty(page: ScoutPage) {
  await page.route(/\/api\/fleet\/package_policies/, async (route, request) => {
    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0, page: 1, perPage: 1000 }),
      });
    } else {
      await route.continue();
    }
  });
}

// ---------------------------------------------------------------------------
// Cloud connectors
// ---------------------------------------------------------------------------

export interface MockCloudConnector {
  id: string;
  name: string;
  cloudProvider: 'aws' | 'azure' | 'gcp';
  vars: Record<string, unknown>;
}

function buildMockConnector(
  id: string,
  name: string,
  cloudProvider: 'aws' | 'azure' | 'gcp',
  vars: Record<string, unknown>
): MockCloudConnector {
  return { id, name, cloudProvider, vars };
}

/**
 * Intercepts GET /api/fleet/cloud_connectors and returns an empty list.
 * Lets POST/PUT/DELETE pass through (or be caught by mockCloudConnectorsCreate).
 */
export async function mockCloudConnectorsEmpty(page: ScoutPage) {
  await page.route(/\/api\/fleet\/cloud_connectors/, async (route, request) => {
    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0 }),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Intercepts POST /api/fleet/cloud_connectors, captures the request body,
 * and returns a mock connector. GET requests return an empty list.
 */
export async function mockCloudConnectorsCreate(
  page: ScoutPage,
  onCapture: (body: Record<string, unknown>) => void
) {
  await page.route(/\/api\/fleet\/cloud_connectors/, async (route, request) => {
    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0 }),
      });
    } else if (request.method() === 'POST') {
      const body = request.postDataJSON() as Record<string, unknown>;
      onCapture(body);
      const mockId = `mock-connector-${Date.now()}`;
      const connector = buildMockConnector(
        mockId,
        (body.name as string) ?? 'mock-connector',
        (body.cloudProvider as 'aws' | 'azure' | 'gcp') ?? 'aws',
        (body.vars as Record<string, unknown>) ?? {}
      );
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          item: { ...connector, id: mockId, created_at: new Date().toISOString() },
        }),
      });
    } else {
      await route.continue();
    }
  });
}

// ---------------------------------------------------------------------------
// Managed integrations (agentless policy controller)
// ---------------------------------------------------------------------------

/**
 * Intercepts POST /api/fleet/managed_integrations, captures the request body,
 * and returns a mock agentless policy. All other methods pass through.
 *
 * This prevents any real request reaching the agentless controller during CI.
 */
export async function mockManagedIntegrationsCreate(
  page: ScoutPage,
  onCapture: (body: Record<string, unknown>) => void
) {
  await page.route(/\/api\/fleet\/managed_integrations/, async (route, request) => {
    if (request.method() === 'POST') {
      const body = request.postDataJSON() as Record<string, unknown>;
      onCapture(body);
      const mockPolicyId = `mock-policy-${Date.now()}`;
      const now = new Date().toISOString();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          item: {
            id: mockPolicyId,
            name: body.name,
            namespace: (body.namespace as string) ?? 'default',
            package: body.package,
            inputs: body.inputs ?? {},
            vars: body.vars,
            cloud_connector: body.cloud_connector,
            created_at: now,
            created_by: 'test_user',
            updated_at: now,
            updated_by: 'test_user',
          },
        }),
      });
    } else {
      await route.continue();
    }
  });
}
