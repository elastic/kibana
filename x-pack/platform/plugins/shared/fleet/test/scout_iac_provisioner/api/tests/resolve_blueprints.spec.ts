/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { apiTest, testData } from '../fixtures';

const VALID_BODY = {
  provider: 'aws',
  flow: 'cloud_connector',
  integrations: [
    {
      name: 'this_package_does_not_exist',
      policyTemplates: [{ name: 'whatever', enabledInputs: ['input'] }],
    },
  ],
};

/**
 * API coverage for the internal IaC Provisioner resolve route.
 *
 * The live 200 resolve path needs a running IaC Provisioner and is not
 * exercised here. These specs cover authorization, request-schema validation,
 * and the unknown-package 404.
 */
apiTest.describe(
  'Fleet IaC Provisioner resolve route',
  { tag: tags.serverless.security.complete },
  () => {
    apiTest(
      'rejects a caller without Fleet privileges with 403',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(testData.NO_FLEET_ACCESS_ROLE);

        const response = await apiClient.post(testData.RESOLVE_BLUEPRINTS_PATH, {
          headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
          body: VALID_BODY,
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(403);
      }
    );

    apiTest('returns 400 when flow is missing', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(testData.FLEET_READ_ROLE);

      const response = await apiClient.post(testData.RESOLVE_BLUEPRINTS_PATH, {
        headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
        body: {
          provider: 'aws',
          integrations: VALID_BODY.integrations,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(400);
    });

    apiTest(
      'returns 404 for an authorized request naming an unknown package',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(testData.FLEET_READ_ROLE);

        const response = await apiClient.post(testData.RESOLVE_BLUEPRINTS_PATH, {
          headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
          body: VALID_BODY,
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(404);
      }
    );
  }
);
