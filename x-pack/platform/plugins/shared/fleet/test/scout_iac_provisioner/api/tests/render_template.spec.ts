/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { apiTest, testData } from '../fixtures';

/**
 * API coverage for the internal IaC Provisioner render route.
 *
 * The live 200 render path needs a running IaC Provisioner (mTLS) and is not
 * exercised here. These specs cover the paths that settle inside Kibana: route
 * authorization, request-schema validation, and the unknown-package 404. A
 * requested package that does not exist resolves to 404 (not 403), which proves
 * route-level authorization succeeded without reaching the provisioner.
 */
apiTest.describe(
  'Fleet IaC Provisioner render route',
  { tag: tags.serverless.security.complete },
  () => {
    apiTest(
      'rejects a caller without Fleet privileges with 403',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(testData.NO_FLEET_ACCESS_ROLE);

        const response = await apiClient.post(testData.RENDER_TEMPLATE_PATH, {
          headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
          body: {
            provider: 'aws',
            flow: 'cloud_connector',
            integrations: [{ name: 'cloud_security_posture', policyTemplates: ['cspm'] }],
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(403);
      }
    );

    apiTest('returns 400 when flow is missing', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(testData.FLEET_READ_ROLE);

      const response = await apiClient.post(testData.RENDER_TEMPLATE_PATH, {
        headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
        body: {
          provider: 'aws',
          integrations: [{ name: 'cloud_security_posture', policyTemplates: ['cspm'] }],
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(400);
    });

    apiTest('returns 400 for an empty integrations array', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(testData.FLEET_READ_ROLE);

      const response = await apiClient.post(testData.RENDER_TEMPLATE_PATH, {
        headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
        body: {
          provider: 'aws',
          flow: 'cloud_connector',
          integrations: [],
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(400);
    });

    apiTest(
      'returns 400 when more than 10 integrations are sent',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(testData.FLEET_READ_ROLE);

        const response = await apiClient.post(testData.RENDER_TEMPLATE_PATH, {
          headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
          body: {
            provider: 'aws',
            flow: 'cloud_connector',
            integrations: Array.from({ length: 11 }, (_, i) => ({
              name: `pkg_${i}`,
              policyTemplates: ['tpl'],
            })),
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(400);
      }
    );

    apiTest(
      'returns 404 for an authorized request naming an unknown package',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(testData.FLEET_READ_ROLE);

        const response = await apiClient.post(testData.RENDER_TEMPLATE_PATH, {
          headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
          body: {
            provider: 'aws',
            flow: 'cloud_connector',
            integrations: [{ name: 'this_package_does_not_exist', policyTemplates: ['whatever'] }],
          },
          responseType: 'json',
        });

        // 404 (not 403) proves route authorization succeeded and the handler ran.
        expect(response).toHaveStatusCode(404);
      }
    );
  }
);
