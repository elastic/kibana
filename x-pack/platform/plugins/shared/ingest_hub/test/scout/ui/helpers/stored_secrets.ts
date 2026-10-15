/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { mockAwsPackage } from './onboarding';

// A deployed policy keeps its credentials as Fleet secrets; the wizard never has them in memory
// after a resume. These specs check that the credential forms offer the stored secrets instead of
// asking again, and that what is sent back to Fleet keeps them (Fleet's PUT is a full replace, so a
// secret var that is left out is deleted).

export const MOCK_AWS_PACKAGE = {
  item: {
    version: '7.1.1',
    vars: [
      { name: 'access_key_id', type: 'text', secret: true },
      { name: 'secret_access_key', type: 'password', secret: true },
    ],
    policy_templates: [
      {
        name: 'elb',
        title: 'AWS ELB',
        data_streams: ['elb_logs'],
        deployment_modes: { agentless: { enabled: true } },
        inputs: [{ type: 'aws-s3' }],
      },
    ],
    data_streams: [
      {
        path: 'elb_logs',
        type: 'logs',
        streams: [
          {
            input: 'aws-s3',
            vars: [{ name: 'bucket_arn', type: 'text', title: 'Bucket ARN', show_user: true }],
          },
        ],
      },
    ],
  },
};

export const ACCESS_KEY_REF = { isSecretRef: true, id: 'ref-access-key-id' };
export const SECRET_KEY_REF = { isSecretRef: true, id: 'ref-secret-access-key' };

export const MI_POLICY_ID = 'mock-mi-policy-id';
export const AB_POLICY_ID = 'mock-ab-pkg-policy-id';

export const soRoute = (depId: string) => (url: URL) =>
  new RegExp(`/api/fleet/cloud_onboarding_deployments/${depId}$`).test(url.pathname);

export const soItem = (depId: string, overrides: Record<string, unknown>) => ({
  id: depId,
  provider: 'aws',
  connectorId: null,
  authMethod: 'static_keys',
  services: ['elb'],
  serviceVars: {},
  status: 'succeeded',
  attemptCount: 1,
  globalRegion: 'us-east-1',
  ...overrides,
});

export const fulfillJson = (body: unknown) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

export async function mockCommonRoutes(page: ScoutPage) {
  await mockAwsPackage(page, MOCK_AWS_PACKAGE);
  // Returning an empty list immediately keeps the identity federation form from hanging.
  await page.route(
    (url) => /\/api\/fleet\/cloud_connectors/.test(url.pathname),
    (route) => route.fulfill(fulfillJson({ items: [] }))
  );
}

/** Mocks the SO GET and PUT of a deployment with the same item. */
export async function mockDeploymentSo(
  page: ScoutPage,
  depId: string,
  item: Record<string, unknown>
) {
  await page.route(soRoute(depId), (route) => route.fulfill(fulfillJson({ item })));
}

export async function seedSession(
  page: ScoutPage,
  entries: Array<{ key: string; value: Record<string, unknown> }>
) {
  await page.addInitScript((seeds) => {
    for (const { key, value } of seeds) {
      sessionStorage.setItem(key, JSON.stringify(value));
    }
  }, entries);
}

export const ELB_INSTANCE = {
  instanceId: 'elb',
  serviceId: 'elb',
  name: 'AWS ELB',
  isDuplicate: false,
};
